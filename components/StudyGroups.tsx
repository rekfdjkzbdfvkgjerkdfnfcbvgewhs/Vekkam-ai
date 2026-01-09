
import React, { useState, useEffect, useRef } from 'react';
import { Users, PlusCircle, LogIn, Send, MessageSquare, Copy, Check, Hash, Loader2, Paperclip, FileText, Download } from 'lucide-react';
import { UserInfo, StudyGroup, GroupMessage } from '../types';
import { createStudyGroup, joinStudyGroup, getStudyGroupsForUser, sendGroupMessage, getGroupMessagesStream } from '../services/firebase';

interface StudyGroupsProps {
  user: UserInfo;
  userStudyGroups: StudyGroup[];
  setUserStudyGroups: React.Dispatch<React.SetStateAction<StudyGroup[]>>;
}

const StudyGroups: React.FC<StudyGroupsProps> = ({ user, userStudyGroups, setUserStudyGroups }) => {
  const [groupName, setGroupName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Real-time listener for messages in the selected group
    let unsubscribe: (() => void) | undefined;
    if (selectedGroup) {
      unsubscribe = getGroupMessagesStream(selectedGroup.id, (messages) => {
        setGroupMessages(messages);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedGroup]);

  useEffect(() => {
    // Scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  const handleMediaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit file size to 5MB for direct base64 embedding in Firestore documents
      if (file.size > 5 * 1024 * 1024) { 
        setError("Media file too large. Max 5MB allowed for direct embedding.");
        setSelectedMediaFile(null);
        setMediaPreviewUrl(null);
        e.target.value = ''; // Clear file input
        return;
      }
      setSelectedMediaFile(file);
      setMediaPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleClearMedia = () => {
    setSelectedMediaFile(null);
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const creatorInfo = { id: user.id, name: user.name, picture: user.picture };
      const newGroup = await createStudyGroup(user.id, creatorInfo, groupName);
      setUserStudyGroups(prev => [...prev, newGroup]);
      setGroupName('');
      setSelectedGroup(newGroup); // Automatically select the new group
    } catch (err: any) {
      console.error("Error creating group:", err);
      setError(err.message || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!accessCode.trim()) {
      setError("Access code cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userInfo = { id: user.id, name: user.name, picture: user.picture };
      const joinedGroup = await joinStudyGroup(user.id, userInfo, accessCode);
      setUserStudyGroups(prev => [...prev, joinedGroup]);
      setAccessCode('');
      setSelectedGroup(joinedGroup); // Automatically select the joined group
    } catch (err: any) {
      console.error("Error joining group:", err);
      setError(err.message || "Failed to join group.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && !selectedMediaFile) || !selectedGroup || loading) return;

    setLoading(true);
    setError(null);

    try {
      let messageToSend: Omit<GroupMessage, 'id'> = {
        senderId: user.id,
        senderName: user.name,
        content: chatInput,
        timestamp: new Date().toISOString(),
      };

      if (selectedMediaFile) {
        messageToSend.content = chatInput || ""; // Use chatInput as caption or empty string
        const reader = new FileReader();
        
        const fileReadPromise = new Promise<void>((resolve, reject) => {
          reader.onloadend = async () => {
            if (typeof reader.result === 'string') {
              messageToSend.mediaDataUrl = reader.result;
              messageToSend.mediaMimeType = selectedMediaFile.type;
              try {
                await sendGroupMessage(selectedGroup.id, messageToSend);
                setChatInput('');
                handleClearMedia();
                resolve();
              } catch (error) {
                console.error("Error sending message with media:", error);
                setError("Failed to send media message.");
                reject(error);
              }
            } else {
              reject(new Error("FileReader did not return a string result."));
            }
          };
          reader.onerror = (error) => {
            console.error("Error reading file:", error);
            setError("Failed to read media file.");
            reject(error);
          };
          reader.readAsDataURL(selectedMediaFile);
        });
        await fileReadPromise; // Wait for file reading and message sending
      } else {
        // Original logic for text-only messages
        await sendGroupMessage(selectedGroup.id, messageToSend);
        setChatInput('');
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000); // Clear checkmark after 2 seconds
  };

  return (
    <div className="flex h-full bg-white dark:bg-black transition-colors">
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-extrabold text-black dark:text-white mb-1">Study Groups</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Connect and Conquer</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Create Group */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <PlusCircle size={16} /> Create Group
            </h3>
            <input
              type="text"
              placeholder="Group Name (e.g., 'Econ 101 Warriors')"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              disabled={loading}
            />
            <button
              onClick={handleCreateGroup}
              disabled={loading || !groupName.trim()}
              className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-semibold hover:opacity-80 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Create New Group"}
            </button>
          </div>

          {/* Join Group */}
          <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <LogIn size={16} /> Join Group
            </h3>
            <input
              type="text"
              placeholder="Enter Access Code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              disabled={loading}
              maxLength={6}
            />
            <button
              onClick={handleJoinGroup}
              disabled={loading || accessCode.trim().length !== 6}
              className="w-full py-2.5 bg-gray-800 dark:bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Join Existing Group"}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs mt-4">
              {error}
            </div>
          )}

          {/* My Study Groups */}
          <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Users size={16} /> My Study Groups
            </h3>
            {userStudyGroups.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No groups yet. Create or join one!</p>
            ) : (
              userStudyGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full p-4 rounded-lg text-left transition-colors duration-200 group relative ${
                    selectedGroup?.id === group.id
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-black dark:hover:border-white'
                  }`}
                >
                  <p className="font-semibold text-base mb-1 truncate">{group.name}</p>
                  <div className="flex items-center gap-2 text-xs opacity-80">
                    <Hash size={12} />
                    <span>{group.accessCode}</span>
                    <span className="ml-auto opacity-70">{group.members.length} members</span>
                  </div>
                  {copiedCode === group.accessCode ? (
                    <Check size={16} className="absolute top-4 right-4 text-white dark:text-black" />
                  ) : (
                    <Copy size={16} className={`absolute top-4 right-4 cursor-pointer ${selectedGroup?.id === group.id ? 'text-white dark:text-black' : 'text-gray-400 group-hover:text-black dark:group-hover:text-white'}`} onClick={(e) => { e.stopPropagation(); copyToClipboard(group.accessCode); }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <MessageSquare size={24} className="text-black dark:text-white" />
          <h3 className="text-xl font-extrabold text-black dark:text-white">{selectedGroup ? selectedGroup.name : "Select a Study Group"}</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50 dark:bg-gray-900">
          {!selectedGroup ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
              <Users size={48} className="mb-4 opacity-20" />
              <p>Choose a group from the left to start chatting.</p>
            </div>
          ) : (
            groupMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col max-w-[70%] ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}>
                  <div className="text-xs text-gray-500 mb-1">
                    {msg.senderId === user.id ? 'You' : msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {msg.mediaDataUrl && msg.mediaMimeType && (
                      <div className="mb-2 max-w-full flex flex-col items-center">
                          {msg.mediaMimeType.startsWith('image/') && (
                              <img 
                                  src={msg.mediaDataUrl} 
                                  alt="Shared media" 
                                  className="max-w-full h-auto rounded-lg object-contain cursor-pointer border border-gray-200 dark:border-gray-700" 
                                  onClick={() => window.open(msg.mediaDataUrl, '_blank')} 
                              />
                          )}
                          {msg.mediaMimeType.startsWith('video/') && (
                              <video 
                                  src={msg.mediaDataUrl} 
                                  controls 
                                  className="max-w-full h-auto rounded-lg object-contain" 
                              />
                          )}
                          {msg.mediaMimeType.startsWith('audio/') && (
                              <audio 
                                  src={msg.mediaDataUrl} 
                                  controls 
                                  className="w-full rounded-lg" 
                              />
                          )}
                          <button
                              onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = msg.mediaDataUrl as string;
                                  link.download = `shared_media_${msg.id}.${msg.mediaMimeType?.split('/')[1] || 'file'}`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                              }}
                              className="mt-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-black dark:text-white text-xs rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-1"
                          >
                              <Download size={12} /> Download
                          </button>
                      </div>
                  )}
                  {msg.content.trim() !== "" && (
                      <div className={`p-3 rounded-lg shadow-sm text-sm ${
                        msg.senderId === user.id
                          ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-none'
                          : 'bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-black dark:text-white rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          {selectedMediaFile && mediaPreviewUrl && (
              <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg flex flex-col items-center border border-gray-200 dark:border-gray-800">
                  {selectedMediaFile.type.startsWith('image/') ? (
                      <img src={mediaPreviewUrl} alt="Media preview" className="max-h-32 rounded-md object-contain mb-2" />
                  ) : selectedMediaFile.type.startsWith('video/') ? (
                      <video src={mediaPreviewUrl} controls className="max-h-32 rounded-md object-contain mb-2" />
                  ) : selectedMediaFile.type.startsWith('audio/') ? (
                      <audio src={mediaPreviewUrl} controls className="w-full mb-2" />
                  ) : (
                      <div className="flex items-center gap-2 text-black dark:text-white">
                          <FileText size={20} />
                          <span>{selectedMediaFile.name}</span>
                      </div>
                  )}
                  <p className="text-xs text-amber-600 mb-2">
                      ⚠️ Large files may impact chat performance.
                  </p>
                  <button onClick={handleClearMedia} className="text-sm text-red-500 hover:underline">
                      Clear Media
                  </button>
              </div>
          )}
          <div className="relative">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleMediaFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-2 top-2 p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Attach media"
                disabled={loading || !!selectedMediaFile} 
            >
                <Paperclip size={18} />
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={selectedGroup ? (selectedMediaFile ? "Add caption or send..." : "Send a message or attach media...") : "Select a group to chat"}
              className="w-full pl-14 pr-12 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-black dark:text-white rounded-lg outline-none focus:border-black dark:focus:border-white transition-colors"
              disabled={!selectedGroup || loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!selectedGroup || (!chatInput.trim() && !selectedMediaFile) || loading}
              className="absolute right-2 top-2 p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyGroups;
