import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Minimize2, RefreshCw, Grab } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { MindMapNode, MindMapEdge } from '../types';

interface MindMapProps {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  theme?: 'light' | 'dark';
}

const MindMap: React.FC<MindMapProps> = ({ nodes, edges, theme = 'dark' }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(nodes[0]?.id || null);

  const isDark = theme === 'dark';

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const isConnected = (nodeId: string) => {
    if (!activeNode) return false;
    if (activeNode === nodeId) return true;
    return edges.some(edge => 
      (edge.from === activeNode && edge.to === nodeId) || 
      (edge.to === activeNode && edge.from === nodeId)
    );
  };

  const isEdgeActive = (fromId: string, toId: string) => {
    if (!activeNode) return false;
    return fromId === activeNode || toId === activeNode;
  };

  const content = (
    <div className={`relative w-full h-full ${isDark ? 'bg-[#050B14]' : 'bg-slate-50'} overflow-hidden flex flex-col group/mindmap transition-colors duration-500`}>
      {/* Background Pattern */}
      <div className={`absolute inset-0 ${isDark ? 'opacity-[0.03]' : 'opacity-[0.05]'} pointer-events-none`} 
           style={{ 
             backgroundImage: `radial-gradient(${isDark ? '#ffffff' : '#000000'} 1px, transparent 1px)`, 
             backgroundSize: '40px 40px' 
           }} />

      {/* Top Header Label */}
      <div className="absolute top-4 left-4 md:top-6 md:left-8 z-20 pointer-events-none">
        <div className={`flex items-center gap-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'} backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-xl border`}>
          <Grab className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Klik bola • Scroll Zoom</span>
        </div>
      </div>

      <TransformWrapper
        initialScale={0.6}
        minScale={0.3}
        maxScale={2}
        centerOnInit={true}
        limitToBounds={false}
        wheel={{ step: 0.05, touchPadPinchSpeed: 0.1 }}
        panning={{ velocityDisabled: true }}
        doubleClick={{ disabled: true }}
        alignmentAnimation={{ size: 0 }}
      >
        {({ resetTransform }) => (
          <>
            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
              <button 
                onClick={toggleFullscreen}
                className={`p-2 md:p-2.5 ${isDark ? 'bg-black/60 border-white/10 text-white/70 hover:text-white' : 'bg-white/80 border-slate-200 text-slate-500 hover:text-slate-900'} backdrop-blur-xl rounded-xl transition-all border active:scale-95 shadow-xl`}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              </button>
              <button 
                onClick={() => resetTransform()}
                className={`p-2 md:p-2.5 ${isDark ? 'bg-black/60 border-white/10 text-white/70 hover:text-white' : 'bg-white/80 border-slate-200 text-slate-500 hover:text-slate-900'} backdrop-blur-xl rounded-xl transition-all border active:scale-95 shadow-xl`}
                title="Reset View"
              >
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>

            <TransformComponent
              wrapperClassName="!w-full !h-full flex-1"
              contentClassName="!w-full !h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
              <div className="w-[800px] h-[600px] flex items-center justify-center relative">
                <svg 
                  className={`w-full h-full ${isDark ? 'drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]' : 'drop-shadow-[0_0_20px_rgba(0,0,0,0.05)]'}`} 
                  viewBox="0 0 1000 800"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Draw Edges */}
                  {edges.map((edge, i) => {
                    const from = nodes.find(n => n.id === edge.from);
                    const to = nodes.find(n => n.id === edge.to);
                    if (!from || !to) return null;
                    const active = isEdgeActive(edge.from, edge.to);
                    
                    return (
                      <motion.line
                        key={`edge-${i}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={active ? (from.type === 'core' ? '#10b981' : '#0ea5e9') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')}
                        strokeWidth={active ? 3 : 1.5}
                        initial={{ 
                          opacity: 0.4,
                          stroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          strokeWidth: 1.5
                        }}
                        animate={{ 
                          stroke: active ? (from.type === 'core' ? '#10b981' : '#0ea5e9') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                          strokeWidth: active ? 3 : 1.5,
                          opacity: active ? 1 : 0.4
                        }}
                        transition={{ duration: 0.4 }}
                      />
                    );
                  })}

                  {/* Draw Nodes */}
                  {nodes.map((node) => {
                    const active = activeNode === node.id;
                    const connected = isConnected(node.id);

                    return (
                      <g 
                        key={node.id} 
                        className="group/node cursor-pointer"
                        onClick={() => setActiveNode(node.id)}
                      >
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={node.type === 'core' ? 65 : node.type === 'main' ? 48 : 38}
                          initial={{ scale: 1, opacity: 0.08 }}
                          animate={{ 
                            scale: active ? 1.1 : 1,
                            opacity: active ? (isDark ? 0.3 : 0.4) : connected ? 0.15 : 0.08
                          }}
                          className={`${
                            node.type === 'core' 
                              ? 'fill-emerald-500' 
                              : node.type === 'main' 
                              ? 'fill-sky-500' 
                              : (isDark ? 'fill-slate-600' : 'fill-slate-400')
                          } transition-all duration-300`}
                        />
                        
                        <foreignObject
                          x={node.x - 120}
                          y={node.y - 50}
                          width="240"
                          height="100"
                        >
                          <div className="flex items-center justify-center h-full text-center p-2">
                            <motion.div 
                              initial={{ 
                                scale: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                              }}
                              animate={{ 
                                scale: active ? 1.05 : 1,
                                borderColor: active 
                                  ? (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)') 
                                  : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                              }}
                              className={`
                                font-black tracking-tight leading-tight px-5 py-3 rounded-[1.5rem] shadow-2xl border transition-all duration-200
                                ${node.type === 'core' 
                                  ? 'bg-emerald-600 text-white border-emerald-400/40 text-base' 
                                  : node.type === 'main' 
                                  ? `${isDark ? 'bg-[#0A1221] text-sky-400 border-sky-900/40' : 'bg-white text-sky-600 border-sky-100'} text-sm` 
                                  : `${isDark ? 'bg-[#0A1221] text-slate-400 border-slate-800/40' : 'bg-white text-slate-500 border-slate-200'} text-[9px] uppercase font-black tracking-widest`
                                }
                                ${active ? (isDark ? 'ring-4 ring-white/10' : 'ring-4 ring-black/5 shadow-emerald-500/10') : ''}
                                ${!connected && !active ? 'opacity-40' : 'opacity-100'}
                                ${node.type === 'core' ? 'shadow-emerald-900/40' : 'shadow-black/10'}
                              `}
                            >
                              {node.label}
                            </motion.div>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
      
      {/* Legend */}
      <div className={`absolute bottom-3 left-3 md:bottom-8 md:left-8 flex md:flex-col gap-2 md:gap-3 ${isDark ? 'bg-black/40 border-white/5' : 'bg-white/80 border-slate-200'} backdrop-blur-xl p-3 md:p-6 rounded-xl md:rounded-[2rem] border shadow-2xl z-20 group-hover/mindmap:translate-y-0 transition-all duration-500`}>
        <div className={`flex items-center gap-2 md:gap-3 text-[7px] md:text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" /> 
          <span className="hidden xs:inline">Topik Utama</span>
        </div>
        <div className={`flex items-center gap-2 md:gap-3 text-[7px] md:text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className="w-2 h-2 md:w-3 md:h-3 bg-sky-500 rounded-full shadow-[0_0_15px_rgba(14,165,233,0.5)]" /> 
          <span className="hidden xs:inline">Roadmap</span>
        </div>
        <div className={`flex items-center gap-2 md:gap-3 text-[7px] md:text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className={`w-2 h-2 md:w-3 md:h-3 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} rounded-full`} /> 
          <span className="hidden xs:inline">Konsep</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={`w-full h-[350px] md:h-[500px] rounded-[1.5rem] md:rounded-[2.5rem] border-2 md:border-8 ${isDark ? 'border-[#0A1221]' : 'border-white'} overflow-hidden shadow-2xl bg-[#050B14] mb-8 transition-all hover:border-sky-900/20 group/mapcontainer ring-1 ${isDark ? 'ring-white/5' : 'ring-black/5'}`}>
        {content}
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MindMap;
