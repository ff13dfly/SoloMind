import React, { useState } from "react";
import { Mic, Keyboard, Image as ImageIcon } from "lucide-react";

interface InputBarProps {
  onSendMessage: (content: string, type: "text" | "voice" | "image" | "file") => void;
}

export function InputBar({ onSendMessage }: InputBarProps) {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue, "text");
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice Mock Logic
  const handleVoiceStart = (e: React.SyntheticEvent) => {
    e.preventDefault(); // Prevent context menu
    // User started holding
    // In real app: start recording
    console.log("Voice started");
  };

  const handleVoiceEnd = (e: React.SyntheticEvent) => {
    e.preventDefault();
    // User released
    // In real app: stop recording and upload
    console.log("Voice ended");
    onSendMessage("Voice Message (3s)", "voice");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create object URL for preview
      const url = URL.createObjectURL(file);
      onSendMessage(url, "image");
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <div className="flex items-end gap-2 p-2 bg-[#f7f7f7] border-t border-gray-200">
      {/* Voice/Keyboard Toggle */}
      <button
        onClick={() => setIsVoiceMode(!isVoiceMode)}
        className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
      >
        {isVoiceMode ? <Keyboard size={24} /> : <Mic size={24} />}
      </button>

      {/* Input Area */}
      <div className="flex-1 min-h-[40px] flex items-center">
        {isVoiceMode ? (
          <button
            className="w-full h-10 bg-white border border-gray-300 rounded-md font-medium text-gray-700 active:bg-gray-200 select-none touch-none"
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={handleVoiceStart}
            onMouseUp={handleVoiceEnd}
            onTouchStart={handleVoiceStart}
            onTouchEnd={handleVoiceEnd}
          >
            Hold to Talk
          </button>
        ) : (
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full max-h-32 py-2 px-3 bg-white border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 resize-none text-base"
            rows={1}
            placeholder=""
          />
        )}
      </div>

      {/* Image Upload Button */}
      <button 
        className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
        onClick={() => imageInputRef.current?.click()}
      >
        <ImageIcon size={24} />
      </button>

      {/* Hidden Inputs */}
      <input 
        type="file" 
        className="hidden" 
        ref={imageInputRef} 
        accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
        onChange={handleImageUpload}
      />
    </div>
  );
}
