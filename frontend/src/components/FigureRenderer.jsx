import React from 'react';

const FigureRenderer = ({ data, className = "" }) => {
  if (!data || !data.elements) return null;

  const { viewBox = "0 0 400 300", elements = [] } = data;

  return (
    <div className={`figure-wrapper my-6 flex justify-center ${className}`}>
      <svg 
        viewBox={viewBox} 
        className="max-w-full h-auto bg-slate-50 rounded-xl border border-slate-200 shadow-inner"
        style={{ maxHeight: '400px' }}
      >
        {/* Render Lines first (below points) */}
        {elements.filter(el => el.type === 'line').map((line, i) => (
          <line
            key={`line-${i}`}
            x1={line.start[0]}
            y1={line.start[1]}
            x2={line.end[0]}
            y2={line.end[1]}
            stroke="black"
            strokeWidth="1.5"
            strokeDasharray={line.dashed ? "5,5" : "0"}
          />
        ))}

        {/* Render Polygons/Shapes */}
        {elements.filter(el => el.type === 'polygon').map((poly, i) => (
          <polygon
            key={`poly-${i}`}
            points={poly.points.map(p => p.join(',')).join(' ')}
            fill={poly.fill || "rgba(59, 130, 246, 0.1)"}
            stroke="black"
            strokeWidth="1.5"
          />
        ))}

        {/* Render Circles */}
        {elements.filter(el => el.type === 'circle').map((circle, i) => (
          <circle
            key={`circle-${i}`}
            cx={circle.center[0]}
            cy={circle.center[1]}
            r={circle.radius}
            fill="none"
            stroke="black"
            strokeWidth="1.5"
          />
        ))}

        {/* Render Points and Labels on top */}
        {elements.filter(el => el.type === 'point').map((pt, i) => (
          <g key={`pt-${i}`}>
            <circle cx={pt.x} cy={pt.y} r="3" fill="black" />
            {pt.label && (
              <text
                x={pt.x + (pt.labelPos?.[0] || 5)}
                y={pt.y + (pt.labelPos?.[1] || -5)}
                fontSize="14"
                fontWeight="bold"
                fontFamily="serif"
              >
                {pt.label}
              </text>
            )}
          </g>
        ))}

        {/* 3D Template rendering logic will be added here in Phase 3 */}
      </svg>
    </div>
  );
};

export default FigureRenderer;
