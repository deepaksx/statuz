import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
  className?: string;
}

export function MermaidChart({ chart, className = '' }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Generate a new unique ID for each render to avoid mermaid conflicts
  const getChartId = () => `mermaid-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;

  useEffect(() => {
    // Initialize mermaid with configuration - using default light theme for readability
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#1f2937',
        primaryBorderColor: '#1e40af',
        lineColor: '#374151',
        secondaryColor: '#10b981',
        tertiaryColor: '#f59e0b',
        background: '#ffffff',
        mainBkg: '#e5e7eb',
        secondBkg: '#f3f4f6',
        tertiaryBkg: '#f9fafb',
        textColor: '#1f2937',
        border1: '#d1d5db',
        border2: '#9ca3af',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      },
      gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        barGap: 4,
        topPadding: 50,
        leftPadding: 75,
        gridLineStartPadding: 35,
        fontSize: 11,
        sectionFontSize: 11,
        numberSectionStyles: 4,
      },
    });
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current) {
        console.warn('MermaidChart: Container ref not available');
        return;
      }

      const currentChartId = getChartId();

      console.log('MermaidChart: Rendering chart', {
        chartId: currentChartId,
        chartLength: chart?.length,
        chartPreview: chart?.substring(0, 100),
        fullChart: chart
      });

      try {
        // Clear previous chart
        containerRef.current.innerHTML = '';

        if (!chart || chart.trim() === '') {
          throw new Error('Empty chart data provided');
        }

        // Render the chart with a unique ID
        console.log('MermaidChart: Calling mermaid.render with chartId:', currentChartId);
        const { svg } = await mermaid.render(currentChartId, chart);

        console.log('MermaidChart: Successfully rendered', {
          svgLength: svg.length,
          svgPreview: svg.substring(0, 200)
        });

        // Insert the SVG into the container
        containerRef.current.innerHTML = svg;

        // Ensure SVG is visible by adding display styles
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) {
          const viewBox = svgElement.getAttribute('viewBox');
          const height = svgElement.getAttribute('height');

          // If height is null but viewBox exists, calculate height from viewBox
          if (!height && viewBox) {
            const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
            if (vbWidth && vbHeight) {
              // Set explicit dimensions based on viewBox
              svgElement.setAttribute('width', vbWidth.toString());
              svgElement.setAttribute('height', vbHeight.toString());
              console.log('MermaidChart: Set explicit dimensions from viewBox', {
                width: vbWidth,
                height: vbHeight
              });
            }
          }

          // Force visibility with explicit styling
          svgElement.style.width = '100%';
          svgElement.style.height = 'auto';
          svgElement.style.display = 'block';
          svgElement.style.visibility = 'visible';
          svgElement.style.opacity = '1';

          // Use setTimeout to get computed dimensions after DOM update
          setTimeout(() => {
            const rect = svgElement.getBoundingClientRect();
            console.log('MermaidChart: SVG dimensions', {
              width: svgElement.getAttribute('width'),
              height: svgElement.getAttribute('height'),
              viewBox: svgElement.getAttribute('viewBox'),
              computedHeight: rect.height,
              computedWidth: rect.width,
              isVisible: rect.height > 0
            });
          }, 0);
        }
      } catch (error) {
        console.error('MermaidChart: Failed to render', error);
        console.error('MermaidChart: Chart data:', chart);
        containerRef.current.innerHTML = `
          <div class="p-4 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
            <strong>Error rendering chart:</strong> ${error instanceof Error ? error.message : 'Unknown error'}
            <pre class="mt-2 text-xs overflow-auto max-h-32">${chart?.substring(0, 200) || 'No chart data'}</pre>
          </div>
        `;
      }
    };

    renderChart();
  }, [chart]);

  return <div ref={containerRef} className={className} />;
}
