
import React, { useState, useEffect, useRef } from 'react';
import { Users, PlusCircle, LogIn, Send, MessageSquare, Copy, Check, Hash, Loader2 } from 'lucide-react';
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
    if (!chatInput.trim() || !selectedGroup) return;
    try {
      const message: Omit<GroupMessage, 'id'> = {
        senderId: user.id,
        senderName: user.name,
        content: chatInput,
        timestamp: new Date().toISOString(), // Temporary client-side timestamp
      };
      await sendGroupMessage(selectedGroup.id, message);
      setChatInput('');
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000); // Clear checkmark after 2 seconds
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-950 transition-colors">
      <div className="w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-1">Study Groups</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Connect and Conquer</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Create Group */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <PlusCircle size={16} /> Create Group
            </h3>
            <input
              type="text"
              placeholder="Group Name (e.g., 'Econ 101 Warriors')"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
              disabled={loading}
            />
            <button
              onClick={handleCreateGroup}
              disabled={loading || !groupName.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Create New Group"}
            </button>
          </div>

          {/* Join Group */}
          <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <LogIn size={16} /> Join Group
            </h3>
            <input
              type="text"
              placeholder="Enter Access Code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
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
          <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={16} /> My Study Groups
            </h3>
            {userStudyGroups.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600 italic">No groups yet. Create or join one!</p>
            ) : (
              userStudyGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full p-4 rounded-lg text-left transition-colors duration-200 group relative ${
                    selectedGroup?.id === group.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-600'
                  }`}
                >
                  <p className="font-semibold text-base mb-1 truncate">{group.name}</p>
                  <div className="flex items-center gap-2 text-xs opacity-80">
                    <Hash size={12} />
                    <span>{group.accessCode}</span>
                    <span className="ml-auto text-gray-300 dark:text-gray-500">{group.members.length} members</span>
                  </div>
                  {copiedCode === group.accessCode ? (
                    <Check size={16} className="absolute top-4 right-4 text-white" />
                  ) : (
                    <Copy size={16} className={`absolute top-4 right-4 cursor-pointer ${selectedGroup?.id === group.id ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`} onClick={(e) => { e.stopPropagation(); copyToClipboard(group.accessCode); }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
          <MessageSquare size={24} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">{selectedGroup ? selectedGroup.name : "Select a Study Group"}</h3>
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {msg.senderId === user.id ? 'You' : msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={`p-3 rounded-xl shadow-sm text-sm ${
                    msg.senderId === user.id
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={selectedGroup ? "Send a message to your group..." : "Select a group to chat"}
              className="w-full pl-5 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600 transition-colors"
              disabled={!selectedGroup || loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!selectedGroup || !chatInput.trim() || loading}
              className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
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