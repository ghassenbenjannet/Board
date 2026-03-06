import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Arrow, Layer, Line, Rect, Stage, Text, Group, Wedge, Transformer, Image as KImage } from 'react-konva';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, getUploadUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { BoardObject, BoardState, Tool } from '../lib/types';

const randomColor = () => `hsl(${Math.random() * 360},70%,60%)`;
const uid = () => crypto.randomUUID();

type Cursor = { socketId: string; x: number; y: number; name: string; color: string };

export function BoardPage() {
  const { id = '' } = useParams();
  const auth = useAuth();
  const [objects, setObjects] = useState<BoardObject[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [presence, setPresence] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [files, setFiles] = useState<any[]>([]);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0, scale: 1 });
  const [history, setHistory] = useState<BoardObject[][]>([]);
  const [future, setFuture] = useState<BoardObject[][]>([]);
  const socketRef = useRef<Socket | null>(null);
  const color = useMemo(randomColor, []);
  const trRef = useRef<any>(null);

  const pushHistory = (next: BoardObject[]) => {
    setHistory((h) => [...h.slice(-30), objects]);
    setFuture([]);
    setObjects(next);
  };

  useEffect(() => {
    api.get(`/boards/${id}`).then(({ data }) => setObjects(((data.state as BoardState)?.objects || []) as BoardObject[]));
    api.get(`/boards/${id}/files`).then(({ data }) => setFiles(data));
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => api.patch(`/boards/${id}`, { state: { objects } }), 2500);
    return () => clearInterval(interval);
  }, [id, objects]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { token: localStorage.getItem('token') }
    });
    socketRef.current = socket;
    socket.emit('board:join', { boardId: id, color });
    socket.on('presence:update', setPresence);
    socket.on('board:cursor', (c: Cursor) => setCursors((prev) => ({ ...prev, [c.socketId]: c })));
    socket.on('board:update', (state: BoardState) => setObjects(state.objects));
    return () => socket.disconnect();
  }, [id, color]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = tr.getStage()?.find((n: any) => selectedIds.includes(n.attrs.id));
    tr.nodes(nodes || []);
  }, [selectedIds, objects]);

  const createObject = (x: number, y: number): BoardObject | null => {
    switch (tool) {
      case 'sticky':
        return { id: uid(), type: 'sticky', x, y, width: 220, height: 150, text: 'Nouvelle note', fill: '#ffef7a' };
      case 'text':
        return { id: uid(), type: 'text', x, y, text: 'Texte libre', fontSize: 24, fill: '#111' };
      case 'rect':
        return { id: uid(), type: 'rect', x, y, width: 220, height: 120, fill: '#DCFCE7', stroke: '#16A34A' };
      case 'circle':
        return { id: uid(), type: 'circle', x, y, width: 140, height: 140, fill: '#E0E7FF', stroke: '#4F46E5' };
      case 'line':
        return { id: uid(), type: 'line', x, y, points: [0, 0, 200, 0], stroke: '#0F172A' };
      case 'arrow':
        return { id: uid(), type: 'arrow', x, y, points: [0, 0, 220, 40], stroke: '#334155' };
      case 'emoji':
        return { id: uid(), type: 'emoji', x, y, text: '🎯', fontSize: 40 };
      case 'sticker':
        return { id: uid(), type: 'sticker', x, y, width: 120, height: 120, text: '🚀', fill: '#FEF3C7' };
      case 'chart-bar':
        return { id: uid(), type: 'chart-bar', x, y, width: 320, height: 220, data: [12, 18, 9, 24], labels: ['A', 'B', 'C', 'D'] };
      case 'chart-line':
        return { id: uid(), type: 'chart-line', x, y, width: 320, height: 220, data: [5, 14, 8, 16, 12], labels: ['L1', 'L2', 'L3', 'L4', 'L5'] };
      case 'chart-pie':
        return { id: uid(), type: 'chart-pie', x, y, width: 250, height: 250, data: [40, 30, 20, 10], labels: ['Red', 'Blue', 'Green', 'Orange'] };
      default:
        return null;
    }
  };

  const onStageClick = (e: any) => {
    if (e.target === e.target.getStage() && tool !== 'select') {
      const pointer = e.target.getStage().getPointerPosition();
      if (!pointer) return;
      const point = {
        x: (pointer.x - stagePos.x) / stagePos.scale,
        y: (pointer.y - stagePos.y) / stagePos.scale
      };
      const obj = createObject(point.x, point.y);
      if (obj) {
        const next = [...objects, obj];
        pushHistory(next);
        socketRef.current?.emit('board:update', { boardId: id, state: { objects: next } });
      }
      return;
    }
    if (e.target === e.target.getStage()) setSelectedIds([]);
  };

  const updateObject = (objId: string, patch: Partial<BoardObject>) => {
    const next = objects.map((obj) => (obj.id === objId ? { ...obj, ...patch } : obj));
    setObjects(next);
    socketRef.current?.emit('board:update', { boardId: id, state: { objects: next } });
  };

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(`/boards/${id}/files`, form);
    setFiles((prev) => [data, ...prev]);
    return data;
  };

  return (
    <div className="board-shell"
      onPaste={async (e) => {
        const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
        if (!item) return;
        const blob = item.getAsFile();
        if (!blob) return;
        const uploaded = await uploadFile(new File([blob], `clipboard-${Date.now()}.png`, { type: blob.type }));
        const next = [...objects, { id: uid(), type: 'image', x: 100, y: 100, width: 320, height: 220, src: getUploadUrl(uploaded.storageKey) }];
        pushHistory(next);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const uploaded = await uploadFile(file);
        const next = [...objects, { id: uid(), type: 'image', x: 120, y: 120, width: 300, height: 200, src: getUploadUrl(uploaded.storageKey) }];
        pushHistory(next);
      }}
    >
      <aside className="toolbar">
        {(['select', 'sticky', 'text', 'rect', 'circle', 'line', 'arrow', 'emoji', 'sticker', 'chart-bar', 'chart-line', 'chart-pie'] as Tool[]).map((t) => (
          <button key={t} className={tool === t ? 'active' : ''} onClick={() => setTool(t)}>{t}</button>
        ))}
        <button onClick={() => {
          if (history.length === 0) return;
          const prev = history[history.length - 1];
          setHistory((h) => h.slice(0, -1));
          setFuture((f) => [objects, ...f]);
          setObjects(prev);
        }}>Undo</button>
        <button onClick={() => {
          if (future.length === 0) return;
          const [next, ...rest] = future;
          setHistory((h) => [...h, objects]);
          setFuture(rest);
          setObjects(next);
        }}>Redo</button>
        <button onClick={() => {
          if (selectedIds.length === 2) {
            const next = [...objects, { id: uid(), type: 'connector', x: 0, y: 0, fromId: selectedIds[0], toId: selectedIds[1], stroke: '#64748B' }];
            pushHistory(next);
          }
        }}>Connecter 2 objets</button>
        <input type="file" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const uploaded = await uploadFile(file);
          if (file.type.startsWith('image/')) {
            const next = [...objects, { id: uid(), type: 'image', x: 140, y: 140, width: 300, height: 210, src: getUploadUrl(uploaded.storageKey) }];
            pushHistory(next);
          }
        }} />
        <h4>Présence</h4>
        {presence.map((p) => <div key={p.id} style={{ color: p.color }}>{p.name}</div>)}
      </aside>

      <div className="canvas-wrap">
        <Stage
          width={window.innerWidth - 300}
          height={window.innerHeight}
          onClick={onStageClick}
          x={stagePos.x}
          y={stagePos.y}
          scaleX={stagePos.scale}
          scaleY={stagePos.scale}
          draggable={tool === 'select'}
          onDragEnd={(e) => setStagePos((s) => ({ ...s, x: e.target.x(), y: e.target.y() }))}
          onWheel={(e) => {
            e.evt.preventDefault();
            const newScale = Math.max(0.2, Math.min(3, stagePos.scale - e.evt.deltaY * 0.001));
            setStagePos((s) => ({ ...s, scale: newScale }));
          }}
          onMouseMove={(e) => {
            const pos = e.target.getStage()?.getPointerPosition();
            if (!pos) return;
            socketRef.current?.emit('board:cursor', {
              boardId: id,
              x: pos.x,
              y: pos.y,
              color,
              name: auth.user?.name || 'anon'
            });
          }}
        >
          <Layer>
            {objects.map((obj) => {
              const common = {
                id: obj.id,
                key: obj.id,
                x: obj.x,
                y: obj.y,
                rotation: obj.rotation || 0,
                draggable: true,
                onClick: (e: any) => {
                  e.cancelBubble = true;
                  setSelectedIds((prev) => (e.evt.shiftKey ? [...new Set([...prev, obj.id])] : [obj.id]));
                },
                onDragEnd: (e: any) => updateObject(obj.id, { x: e.target.x(), y: e.target.y() }),
                onTransformEnd: (e: any) => {
                  const node = e.target;
                  updateObject(obj.id, {
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(40, (obj.width || node.width()) * node.scaleX()),
                    height: Math.max(40, (obj.height || node.height()) * node.scaleY()),
                    rotation: node.rotation()
                  });
                  node.scaleX(1);
                  node.scaleY(1);
                }
              };

              if (obj.type === 'rect' || obj.type === 'sticky' || obj.type === 'sticker') {
                return (
                  <Group {...common}>
                    <Rect width={obj.width} height={obj.height} fill={obj.fill} stroke={obj.stroke || '#111827'} cornerRadius={obj.type === 'sticker' ? 24 : 8} />
                    {obj.text && <Text text={obj.text} x={12} y={12} width={(obj.width || 100) - 24} fontSize={obj.type === 'sticker' ? 48 : 20} />}
                  </Group>
                );
              }
              if (obj.type === 'text' || obj.type === 'emoji') return <Text {...common} text={obj.text || ''} fontSize={obj.fontSize || 22} fill={obj.fill || '#111827'} />;
              if (obj.type === 'circle') return <Circle {...common} radius={(obj.width || 100) / 2} fill={obj.fill} stroke={obj.stroke} />;
              if (obj.type === 'line') return <Line {...common} points={obj.points || [0, 0, 120, 0]} stroke={obj.stroke || '#111'} strokeWidth={3} />;
              if (obj.type === 'arrow') return <Arrow {...common} points={obj.points || [0, 0, 180, 20]} stroke={obj.stroke || '#111'} fill={obj.stroke || '#111'} strokeWidth={3} />;
              if (obj.type === 'connector') {
                const from = objects.find((o) => o.id === obj.fromId);
                const to = objects.find((o) => o.id === obj.toId);
                if (!from || !to) return null;
                return <Arrow key={obj.id} points={[from.x, from.y, to.x, to.y]} stroke={obj.stroke || '#64748B'} fill={obj.stroke || '#64748B'} />;
              }
              if (obj.type.startsWith('chart')) {
                const data = obj.data || [1, 2, 3];
                const width = obj.width || 300;
                const height = obj.height || 200;
                const max = Math.max(...data);
                if (obj.type === 'chart-bar') {
                  return <Group {...common}><Rect width={width} height={height} fill="#fff" stroke="#CBD5E1" />{data.map((v, i) => <Rect key={i} x={20 + i * ((width - 40) / data.length)} y={height - 20 - (v / max) * (height - 40)} width={(width - 60) / data.length} height={(v / max) * (height - 40)} fill="#2563EB" />)}</Group>;
                }
                if (obj.type === 'chart-line') {
                  const points = data.flatMap((v, i) => [20 + (i * (width - 40)) / (data.length - 1), height - 20 - (v / max) * (height - 40)]);
                  return <Group {...common}><Rect width={width} height={height} fill="#fff" stroke="#CBD5E1" /><Line points={points} stroke="#16A34A" strokeWidth={3} /></Group>;
                }
                let acc = 0;
                return <Group {...common}><Rect width={width} height={height} fill="#fff" stroke="#CBD5E1" />{data.map((v, i) => {
                  const angle = (v / data.reduce((a, b) => a + b, 0)) * 360;
                  const wedge = <Wedge key={i} x={width / 2} y={height / 2} radius={Math.min(width, height) / 2 - 15} angle={angle} rotation={acc} fill={["#3B82F6", "#EF4444", "#10B981", "#F59E0B"][i % 4]} />;
                  acc += angle;
                  return wedge;
                })}</Group>;
              }
              if (obj.type === 'image' && obj.src) {
                return <CanvasImage {...common} width={obj.width || 220} height={obj.height || 180} src={obj.src} />;
              }
              return null;
            })}
            <Transformer ref={trRef} rotateEnabled enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]} />
          </Layer>
        </Stage>
        {Object.values(cursors).map((c) => (
          <div key={c.socketId} className="cursor" style={{ left: c.x, top: c.y, color: c.color }}>
            ⤴ {c.name}
          </div>
        ))}
      </div>

      <aside className="files">
        <h3>Fichiers</h3>
        {files.map((file) => (
          <div key={file.id} className="file-item">
            <a href={getUploadUrl(file.storageKey)} target="_blank" rel="noreferrer">{file.original}</a>
            <button onClick={async () => {
              await api.delete(`/boards/${id}/files/${file.id}`);
              setFiles((prev) => prev.filter((f) => f.id !== file.id));
            }}>✕</button>
          </div>
        ))}
      </aside>
    </div>
  );
}

function CanvasImage({ src, ...props }: { src: string; [x: string]: any }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setImage(img);
  }, [src]);
  return <KImage image={image} {...props} />;
}
