(() => {
  'use strict';

  const root = document.querySelector('[data-mars-radar]');
  if (!root) return;

  const datasets = [
    {
      title: 'Multimodal Benchmarks',
      subtitle: 'Generalist and domain-specific evaluation',
      labels: [['MME'], ['POPE'], ['MMStar'], ['TextCaps'], ['AI2D'], ['GQA']],
      tableLabels: ['MME (sum)', 'POPE', 'MMStar (avg)', 'TextCaps (Val)', 'AI2D', 'GQA'],
      values: {
        'AdaLoRA': [1524.0, 79.7, 28.6, 38.0, 45.5, 52.7],
        'LoRA (★, 64)': [1662.4, 86.8, 36.1, 42.6, 48.0, 55.1],
        'MARS': [1695.6, 86.3, 39.4, 42.9, 49.9, 55.7]
      }
    },
    {
      title: 'MMStar Capability Breakdown',
      subtitle: 'Fine-grained perception and reasoning',
      labels: [
        ['Coarse', 'Perception'],
        ['Fine-grained', 'Perception'],
        ['Instance', 'Reasoning'],
        ['Logical', 'Reasoning'],
        ['Science &', 'Technology'],
        ['Math']
      ],
      tableLabels: ['Coarse Per.', 'Fine-Grained Per.', 'Instance Reason.', 'Logical Reason.', 'Sci & Tech', 'Math'],
      values: {
        'AdaLoRA': [34.7, 23.2, 27.8, 29.9, 24.4, 31.5],
        'LoRA (★, 64)': [55.5, 27.8, 49.8, 32.1, 22.2, 29.0],
        'MARS': [58.3, 28.4, 48.4, 34.9, 33.0, 33.4]
      }
    }
  ];

  const methods = ['AdaLoRA', 'LoRA (★, 64)', 'MARS'];
  const styles = {
    'AdaLoRA': { color: '#9d9b95', dash: '3 5', width: 1.5, fill: 'none' },
    'LoRA (★, 64)': { color: '#1c756d', dash: '8 4', width: 2, fill: 'none' },
    'MARS': { color: '#dd4a2b', dash: '', width: 3, fill: '#dd4a2b' }
  };
  const visible = new Set(methods);
  const drawers = [];
  const seriesGroups = [];
  const svgNS = 'http://www.w3.org/2000/svg';

  const svgEl = (name, attributes = {}) => {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };

  const tooltip = document.createElement('div');
  tooltip.className = 'radar-tooltip';
  tooltip.hidden = true;
  document.body.append(tooltip);

  const positionTooltip = (event) => {
    const margin = 14;
    const width = tooltip.offsetWidth || 180;
    const x = Math.min(event.clientX + 14, window.innerWidth - width - margin);
    const y = Math.max(margin, event.clientY - 58);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  };

  const showTooltip = (method, label, raw, normalized, event) => {
    tooltip.innerHTML = `<strong>${method}</strong><br><span>${label}</span> &nbsp;${raw.toFixed(1)}<br><span>Comparison-range position</span> &nbsp;${normalized.toFixed(2)}`;
    tooltip.hidden = false;
    positionTooltip(event);
  };

  const hideTooltip = () => { tooltip.hidden = true; };

  const grid = document.createElement('div');
  grid.className = 'radar-grid';
  root.replaceChildren(grid);

  datasets.forEach((dataset, datasetIndex) => {
    const card = document.createElement('article');
    card.className = 'radar-card';
    card.innerHTML = `
      <header>
        <span class="radar-card-index">0${datasetIndex + 1}</span>
        <div><h4>${dataset.title}</h4><p>${dataset.subtitle}</p></div>
        <small>6 metrics</small>
      </header>
      <div class="radar-direction">↗ &nbsp;OUTWARD = BETTER</div>`;

    const svg = svgEl('svg', {
      viewBox: '0 0 420 350',
      class: 'radar-svg',
      role: 'img',
      'aria-label': `${dataset.title}. Each axis uses a padded comparison range; farther outward is better.`
    });
    const cx = 210;
    const cy = 171;
    const radius = 105;
    const labelRadius = 143;
    const axisCount = dataset.labels.length;
    const point = (index, value, customRadius = radius) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / axisCount;
      return [cx + Math.cos(angle) * customRadius * value, cy + Math.sin(angle) * customRadius * value];
    };
    const points = (values, progress = 1) => values
      .map((value, index) => point(index, value * progress).map(v => v.toFixed(2)).join(','))
      .join(' ');

    const outerFill = svgEl('polygon', { points: points(dataset.labels.map(() => 1)), fill: '#fbfaf7', stroke: 'none' });
    svg.append(outerFill);
    [0.25, 0.5, 0.75, 1].forEach(level => {
      svg.append(svgEl('polygon', { points: points(dataset.labels.map(() => level)), class: 'radar-grid-ring' }));
    });

    dataset.labels.forEach((labelLines, index) => {
      const [x, y] = point(index, 1);
      svg.append(svgEl('line', { x1: cx, y1: cy, x2: x, y2: y, class: 'radar-spoke' }));
      const [labelX, labelY] = point(index, 1, labelRadius);
      const angle = -Math.PI / 2 + index * Math.PI * 2 / axisCount;
      const cosine = Math.cos(angle);
      const anchor = cosine > 0.35 ? 'start' : cosine < -0.35 ? 'end' : 'middle';
      const text = svgEl('text', {
        x: labelX,
        y: labelY - (labelLines.length - 1) * 6,
        'text-anchor': anchor,
        'dominant-baseline': 'middle',
        class: 'radar-axis-label'
      });
      labelLines.forEach((line, lineIndex) => {
        const span = svgEl('tspan', { x: labelX, dy: lineIndex === 0 ? 0 : 13 });
        span.textContent = line;
        text.append(span);
      });
      svg.append(text);
    });

    const observedMins = dataset.labels.map((_, index) => Math.min(...methods.map(method => dataset.values[method][index])));
    const observedMaxs = dataset.labels.map((_, index) => Math.max(...methods.map(method => dataset.values[method][index])));
    const plotMins = observedMins.map((minimum, index) => minimum - (observedMaxs[index] - minimum) * 0.25);
    const plotMaxs = observedMaxs.map((maximum, index) => maximum + (maximum - observedMins[index]) * 0.25);
    const normalize = (value, index) => {
      const span = plotMaxs[index] - plotMins[index];
      return span === 0 ? 0.5 : Math.max(0, Math.min(1, (value - plotMins[index]) / span));
    };

    const layer = svgEl('g');
    svg.append(layer);
    methods.forEach(method => {
      const style = styles[method];
      const scores = dataset.values[method].map(normalize);
      const group = svgEl('g', { class: 'radar-series', 'data-radar-series': method });
      const polygon = svgEl('polygon', {
        points: points(scores, 0),
        fill: style.fill,
        'fill-opacity': method === 'MARS' ? 0.1 : 0,
        stroke: style.color,
        'stroke-width': style.width,
        'stroke-dasharray': style.dash
      });
      group.append(polygon);

      const dots = scores.map((score, index) => {
        const dot = svgEl('circle', {
          cx,
          cy,
          r: method === 'MARS' ? 3.4 : 2.6,
          fill: style.color,
          stroke: '#fff',
          'stroke-width': 1,
          tabindex: 0,
          role: 'img',
          'aria-label': `${method}, ${dataset.tableLabels[index]}: ${dataset.values[method][index].toFixed(1)}; comparison-range position ${score.toFixed(2)}`
        });
        const title = svgEl('title');
        title.textContent = dot.getAttribute('aria-label');
        dot.append(title);
        dot.addEventListener('pointerenter', event => showTooltip(method, dataset.tableLabels[index], dataset.values[method][index], score, event));
        dot.addEventListener('pointermove', positionTooltip);
        dot.addEventListener('pointerleave', hideTooltip);
        dot.addEventListener('focus', () => {
          const rect = dot.getBoundingClientRect();
          showTooltip(method, dataset.tableLabels[index], dataset.values[method][index], score, { clientX: rect.left + rect.width / 2, clientY: rect.top });
        });
        dot.addEventListener('blur', hideTooltip);
        group.append(dot);
        return dot;
      });

      layer.append(group);
      seriesGroups.push(group);
      drawers.push(progress => {
        polygon.setAttribute('points', points(scores, progress));
        dots.forEach((dot, index) => {
          const [x, y] = point(index, scores[index] * progress);
          dot.setAttribute('cx', x);
          dot.setAttribute('cy', y);
          dot.style.opacity = progress < 0.72 ? '0' : String((progress - 0.72) / 0.28);
        });
      });
    });

    card.append(svg);
    grid.append(card);
  });

  const legend = document.createElement('div');
  legend.className = 'radar-legend';
  legend.setAttribute('role', 'group');
  legend.setAttribute('aria-label', 'Show or hide methods in both radar plots');
  methods.forEach(method => {
    const style = styles[method];
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.radarMethod = method;
    button.setAttribute('aria-pressed', 'true');
    button.innerHTML = `<svg viewBox="0 0 30 10" aria-hidden="true"><path d="M1 5 H29" fill="none" stroke="${style.color}" stroke-width="${style.width}" stroke-dasharray="${style.dash}"/></svg><span>${method}</span>`;
    const emphasize = () => seriesGroups.forEach(group => { group.style.opacity = group.dataset.radarSeries === method ? '1' : '.14'; });
    const reset = () => seriesGroups.forEach(group => { group.style.opacity = '1'; });
    button.addEventListener('mouseenter', emphasize);
    button.addEventListener('mouseleave', reset);
    button.addEventListener('focus', emphasize);
    button.addEventListener('blur', reset);
    button.addEventListener('click', () => {
      if (visible.has(method) && visible.size > 1) visible.delete(method);
      else visible.add(method);
      seriesGroups.forEach(group => { group.style.display = visible.has(group.dataset.radarSeries) ? '' : 'none'; });
      legend.querySelectorAll('button[data-radar-method]').forEach(item => {
        item.setAttribute('aria-pressed', String(visible.has(item.dataset.radarMethod)));
      });
    });
    legend.append(button);
  });

  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'radar-replay';
  replay.innerHTML = '<span aria-hidden="true">↻</span> Replay';
  legend.append(replay);
  root.append(legend);

  const details = document.createElement('details');
  details.className = 'radar-exact';
  details.innerHTML = '<summary>Exact Appendix I values &amp; plot ranges</summary><p class="radar-formula">For each axis, the plot minimum is the observed minimum minus 25% of the observed span; the plot maximum is the observed maximum plus 25%. This affects presentation only. All metrics are higher-is-better.</p>';
  datasets.forEach(dataset => {
    const wrap = document.createElement('div');
    wrap.className = 'radar-table-wrap';
    const heading = document.createElement('h5');
    heading.textContent = dataset.title;
    const table = document.createElement('table');
    table.className = 'radar-table';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    ['Method', ...dataset.tableLabels].forEach(label => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headerRow.append(th);
    });
    const tbody = table.createTBody();
    methods.forEach(method => {
      const row = tbody.insertRow();
      if (method === 'MARS') row.className = 'is-mars';
      [method, ...dataset.values[method].map(value => value.toFixed(1))].forEach(value => {
        const cell = row.insertCell();
        cell.textContent = value;
      });
    });
    wrap.append(heading, table);
    details.append(wrap);
  });
  root.append(details);

  let frame = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animate = () => {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) {
      drawers.forEach(draw => draw(1));
      return;
    }
    const start = performance.now();
    const duration = 1150;
    const tick = now => {
      const linear = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - linear, 3);
      drawers.forEach((draw, index) => {
        const delay = index * 0.012;
        draw(Math.max(0, Math.min(1, (eased - delay) / (1 - delay))));
      });
      if (linear < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };
  replay.addEventListener('click', animate);

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        animate();
        observer.disconnect();
      }
    }, { threshold: 0.18 });
    observer.observe(root);
  } else {
    animate();
  }
})();
