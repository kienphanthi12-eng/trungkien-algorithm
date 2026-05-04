import React, { useState, useEffect } from 'react';
import FigureRenderer from './FigureRenderer';

const FigureEditor = ({ initialData, onSave, onCancel }) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(initialData || { viewBox: "0 0 400 300", elements: [] }, null, 2));
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(initialData);

  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setParsedData(parsed);
      setError(null);
    } catch (e) {
      setError("Cú pháp JSON không hợp lệ");
    }
  }, [jsonText]);

  const addElement = (type) => {
    const newData = { ...parsedData };
    if (!newData.elements) newData.elements = [];

    if (type === 'point') {
      newData.elements.push({ type: "point", x: 200, y: 150, label: "M" });
    } else if (type === 'line') {
      newData.elements.push({ type: "line", start: [100, 150], end: [300, 150], dashed: false });
    } else if (type === 'circle') {
      newData.elements.push({ type: "circle", center: [200, 150], radius: 50 });
    }

    setJsonText(JSON.stringify(newData, null, 2));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 bg-white rounded-2xl shadow-xl border border-slate-200">
      {/* Editor Side */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Cấu trúc Hình vẽ (JSON)</h3>
          <div className="flex gap-2">
            <button onClick={() => addElement('point')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">+ Điểm</button>
            <button onClick={() => addElement('line')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">+ Đường</button>
            <button onClick={() => addElement('circle')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">+ Tròn</button>
          </div>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className={`w-full h-64 font-mono text-sm p-3 rounded-xl border ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-900 text-green-400'} focus:ring-2 focus:ring-blue-500 outline-none`}
          spellCheck="false"
        />
        {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button 
            onClick={() => onSave(parsedData)}
            disabled={!!error}
            className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Lưu thay đổi
          </button>
          <button 
            onClick={onCancel}
            className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>

      {/* Preview Side */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800 mb-4">Xem trước (Live Preview)</h3>
        <div className="flex-1 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center p-4">
          {!error ? (
            <FigureRenderer data={parsedData} className="w-full" />
          ) : (
            <div className="text-slate-400 text-sm text-center">
              Vui lòng sửa lỗi JSON để xem trước
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 italic text-center">
          * Di chuyển tọa độ (x, y) để điều chỉnh vị trí các phần tử.
        </p>
      </div>
    </div>
  );
};

export default FigureEditor;
