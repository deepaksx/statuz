import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
  className?: string;
}

export function MermaidChart({ chart, className = '' }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Initialize mermaid with configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#1e40af',
        lineColor: '#6b7280',
        secondaryColor: '#10b981',
        tertiaryColor: '#f59e0b',
        background: '#1f2937',
        mainBkg: '#374151',
        secondBkg: '#1f2937',
        tertiaryBkg: '#111827',
        textColor: '#e5e7eb',
        border1: '#4b5563',
        border2: '#6b7280',
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
      if (!containerRef.current) return;

      try {
        // Clear previous chart
        containerRef.current.innerHTML = '';

        // Render the chart
        const { svg } = await mermaid.render(chartId.current, chart);

        // Insert the SVG into the container
        containerRef.current.innerHTML = svg;
      } catch (error) {
        console.error('Failed to render Mermaid chart:', error);
        containerRef.current.innerHTML = `
          <div class="p-4 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
            <strong>Error rendering chart:</strong> ${error instanceof Error ? error.message : 'Unknown error'}
          </div>
        `;
      }
    };

    renderChart();
  }, [chart]);

  return <div ref={containerRef} className={className} />;
}
