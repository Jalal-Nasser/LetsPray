import React from 'react';

export default function TitleBar() {
    const minimize = () => window.electronAPI?.minimize();
    const maximize = () => window.electronAPI?.maximize();
    const close = () => window.electronAPI?.close();

    return (
        <div className="titlebar">
            <span className="titlebar-title">حي على الصلاة</span>
            <div className="titlebar-controls">
                <button className="titlebar-btn minimize" onClick={minimize} aria-label="Minimize" />
                <button className="titlebar-btn maximize" onClick={maximize} aria-label="Maximize" />
                <button className="titlebar-btn close" onClick={close} aria-label="Close" />
            </div>
        </div>
    );
}
