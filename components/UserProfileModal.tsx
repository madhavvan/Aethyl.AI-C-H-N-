
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ConnectedApp } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClearData: () => void;
}

type SettingsTab = 'account' | 'appearance' | 'behavior' | 'data' | 'connected';

const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  profile, 
  onSave,
  onClearData
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [connectingAppId, setConnectingAppId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setFormData(profile);
  }, [isOpen, profile]);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onSave(formData);
      setIsSaving(false);
    }, 500); // Subtle feedback delay
  };

  const handleClear = () => {
    if (confirm("WARNING: This will obliterate all session logs. Proceed?")) {
      onClearData();
      onClose();
    }
  };

  const completeConnection = (appId: string) => {
    const app = formData.connectedApps[appId];
    if (!app) return;

    setConnectingAppId(appId);
    
    // Simulate the final token exchange handshake
    setTimeout(() => {
       const updatedApps = {
          ...formData.connectedApps,
          [appId]: { ...app, isConnected: true, lastSynced: Date.now() }
       };
       const updatedProfile = { ...formData, connectedApps: updatedApps };
       setFormData(updatedProfile);
       onSave(updatedProfile);
       setConnectingAppId(null);
    }, 1000);
  };

  const openAuthPopup = (app: ConnectedApp) => {
    const width = 480;
    const height = 640;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
        '', 
        `Connect ${app.name}`, 
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
    );

    if (!popup) {
        alert("Please allow popups to connect apps.");
        return;
    }

    // Determine basic color hex from Tailwind class for the popup styling
    let iconColor = '#334155'; // Default slate
    if (app.color.includes('red')) iconColor = '#ef4444';
    if (app.color.includes('blue')) iconColor = '#3b82f6';
    if (app.color.includes('purple')) iconColor = '#a855f7';
    if (app.color.includes('green')) iconColor = '#22c55e';
    if (app.color.includes('orange')) iconColor = '#f97316';
    if (app.color.includes('text-white')) iconColor = '#0f172a'; // Black for white icons (Github/X)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorize ${app.name}</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #0f172a; }
          .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); width: 85%; max-width: 400px; text-align: center; border: 1px solid #e2e8f0; }
          .logo-area { display: flex; justify-content: center; margin-bottom: 28px; position: relative; align-items: center; }
          .icon-box { width: 72px; height: 72px; background: #f1f5f9; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 32px; position: relative; z-index: 2; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .connector { height: 2px; width: 40px; background: #cbd5e1; margin: 0 4px; }
          .aether-box { width: 72px; height: 72px; background: #0f172a; border-radius: 18px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          
          h1 { font-size: 22px; margin: 0 0 12px 0; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
          p { color: #64748b; font-size: 15px; margin: 0 0 32px 0; line-height: 1.6; }
          
          .btn { display: flex; align-items: center; justify-content: center; width: 100%; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; border: none; margin-bottom: 12px; transition: all 0.2s; }
          .btn-primary { background: #0f172a; color: white; }
          .btn-primary:hover { background: #334155; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2); }
          .btn-primary:active { transform: translateY(0); }
          .btn-secondary { background: white; border: 1px solid #cbd5e1; color: #475569; }
          .btn-secondary:hover { background: #f1f5f9; border-color: #94a3b8; }
          
          .scope-list { text-align: left; margin-bottom: 32px; background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
          .scope-item { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: #334155; margin-bottom: 14px; }
          .scope-item:last-child { margin-bottom: 0; }
          .scope-item i { color: #10b981; margin-top: 3px; font-size: 14px; }
          
          .secure-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo-area">
             <div class="aether-box"><i class="fa-solid fa-infinity"></i></div>
             <div class="connector"></div>
             <div class="icon-box">
                <i class="fa-brands ${app.icon}" style="color: ${iconColor}"></i>
             </div>
          </div>
          <h1>Connect ${app.name}</h1>
          <p><strong>Aether Lens</strong> wants to access your ${app.name} account to sync data for personalized search.</p>
          
          <div class="scope-list">
            <div class="scope-item"><i class="fa-solid fa-check"></i> <span>View your profile details</span></div>
            <div class="scope-item"><i class="fa-solid fa-check"></i> <span>Read access to workspace content</span></div>
            <div class="scope-item"><i class="fa-solid fa-check"></i> <span>Perform background sync</span></div>
          </div>

          <button class="btn btn-primary" onclick="window.opener.postMessage({ type: 'OAUTH_SUCCESS', appId: '${app.id}' }, '*'); window.close();">Authorize Access</button>
          <button class="btn btn-secondary" onclick="window.close();">Cancel</button>
          
          <div class="secure-badge">
             <i class="fa-solid fa-lock"></i> Secure Connection via OAuth 2.0
          </div>
        </div>
      </body>
      </html>
    `;

    popup.document.write(htmlContent);
    popup.document.close();
  };

  const toggleAppConnection = (appId: string) => {
    const app = formData.connectedApps[appId];
    if (!app) return;

    if (app.isConnected) {
        // Disconnect immediately
        const updatedApps = {
            ...formData.connectedApps,
            [appId]: { ...app, isConnected: false, lastSynced: undefined }
        };
        const updatedProfile = { ...formData, connectedApps: updatedApps };
        setFormData(updatedProfile);
        onSave(updatedProfile);
    } else {
        // Launch Realistic Mock OAuth Flow
        openAuthPopup(app);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Limit size to 2MB
      if (file.size > 2 * 1024 * 1024) {
        alert("Image too large. Please use an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const updated = { ...formData, avatar: event.target.result as string };
          setFormData(updated);
          // Auto save avatar changes
          onSave(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper for Sidebar Items
  const SidebarItem = ({ id, label, icon }: { id: SettingsTab; label: string; icon: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 mb-1
        ${activeTab === id 
          ? 'bg-slate-800 text-white font-medium' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
    >
      <i className={`fa-solid ${icon} w-5 text-center text-sm ${activeTab === id ? 'text-aether-accent' : ''}`}></i>
      <span className="text-sm">{label}</span>
    </button>
  );

  // Listen for OAuth Success Messages from Popups
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if needed, but for this mock we allow *
      if (event.data?.type === 'OAUTH_SUCCESS' && event.data?.appId) {
        completeConnection(event.data.appId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [formData]); // Re-bind when formData changes to ensure we have latest state

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Settings Container (Perplexity Style) */}
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#0f1117] border border-slate-800 rounded-2xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Sidebar */}
        <div className="w-64 bg-[#0a0c10] border-r border-slate-800 flex flex-col p-4">
          
          <div className="mb-6 px-2">
             <button 
                onClick={onClose}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium mb-4"
             >
                <i className="fa-solid fa-chevron-left text-xs"></i> Back to Chat
             </button>
             <h2 className="text-xl font-bold text-white tracking-tight">Settings</h2>
          </div>

          <nav className="flex-1 overflow-y-auto">
             <SidebarItem id="account" label="Account" icon="fa-user" />
             <SidebarItem id="appearance" label="Appearance" icon="fa-palette" />
             <SidebarItem id="behavior" label="Behavior" icon="fa-sliders" />
             <SidebarItem id="data" label="Data Controls" icon="fa-database" />
             <SidebarItem id="connected" label="Connected Apps" icon="fa-link" />
          </nav>
          
          <div className="mt-auto px-4 py-4 text-[10px] text-slate-600 border-t border-slate-800">
             AETHER_LENS OS v3.1<br/>
             BUILD: 2099.ALPHA
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-[#0f1117] flex flex-col min-w-0">
           
           {/* Header for Mobile/Title */}
           <div className="md:hidden p-4 border-b border-slate-800 flex justify-between items-center">
              <span className="font-bold text-white capitalize">{activeTab}</span>
              <button onClick={onClose} className="text-slate-400"><i className="fa-solid fa-xmark"></i></button>
           </div>

           <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
             
             {/* --- ACCOUNT TAB --- */}
             {activeTab === 'account' && (
               <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  
                  {/* Avatar Section */}
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                     <div className="flex items-center gap-4">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                           <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-aether-accent transition-colors">
                              {formData.avatar ? (
                                <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                                   <span className="text-xl font-bold">{formData.username.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <i className="fa-solid fa-camera text-white"></i>
                              </div>
                           </div>
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </div>
                        <div>
                           <div className="text-white font-medium">{formData.username}</div>
                           <div className="text-sm text-slate-500">{formData.email || 'No email linked'}</div>
                        </div>
                     </div>
                     <button className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors">
                        Manage
                     </button>
                  </div>

                  {/* Edit Fields */}
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Display Name</label>
                        <div className="flex gap-2">
                           <input 
                              type="text" 
                              value={formData.username}
                              onChange={(e) => setFormData({...formData, username: e.target.value})}
                              className="flex-1 bg-black border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-aether-accent focus:outline-none"
                           />
                           <button onClick={handleSave} className="text-sm text-aether-accent hover:text-white px-3">Save</button>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                        <div className="flex gap-2">
                           <input 
                              type="text" 
                              value={formData.title || ''}
                              onChange={(e) => setFormData({...formData, title: e.target.value})}
                              className="flex-1 bg-black border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-aether-accent focus:outline-none"
                           />
                           <button onClick={handleSave} className="text-sm text-aether-accent hover:text-white px-3">Save</button>
                        </div>
                     </div>
                  </div>

                  {/* Subscription Mockup */}
                  <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-xl p-6">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold">Aether Pro</h3>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded">ACTIVE</span>
                     </div>
                     <p className="text-sm text-slate-400 mb-4">You have access to Gemini 3.0 Pro, Image Generation, and Neural Voice features.</p>
                     <div className="flex gap-3">
                        <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors">Upgrade Plan</button>
                        <button className="px-4 py-2 bg-transparent border border-slate-600 text-white text-sm font-medium rounded-lg hover:border-white transition-colors">Billing</button>
                     </div>
                  </div>
               </div>
             )}

             {/* --- APPEARANCE TAB --- */}
             {activeTab === 'appearance' && (
                <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                   <div>
                      <h3 className="text-lg font-medium text-white mb-4">Interface Theme</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         
                         {/* Cyber Option */}
                         <button 
                           onClick={() => {
                              const updated = {...formData, themePreference: 'cyber' as const};
                              setFormData(updated);
                              onSave(updated);
                           }}
                           className={`relative group rounded-xl border-2 overflow-hidden text-left transition-all ${formData.themePreference === 'cyber' ? 'border-aether-accent shadow-[0_0_20px_rgba(0,240,255,0.15)]' : 'border-slate-800 hover:border-slate-600'}`}
                         >
                            <div className="h-24 bg-slate-900 relative overflow-hidden">
                               <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-blue-900/40"></div>
                               <div className="absolute top-2 left-2 w-16 h-2 bg-slate-800 rounded"></div>
                               <div className="absolute top-6 left-2 w-10 h-2 bg-slate-800 rounded"></div>
                               <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-aether-accent/20 blur-md"></div>
                            </div>
                            <div className="p-3 bg-[#0a0c10]">
                               <div className="flex justify-between items-center">
                                  <span className={`text-sm font-bold ${formData.themePreference === 'cyber' ? 'text-aether-accent' : 'text-white'}`}>Cyber</span>
                                  {formData.themePreference === 'cyber' && <i className="fa-solid fa-circle-check text-aether-accent text-xs"></i>}
                               </div>
                               <p className="text-[10px] text-slate-500 mt-1">Immersive. Neon.</p>
                            </div>
                         </button>

                         {/* Minimal Option */}
                         <button 
                           onClick={() => {
                              const updated = {...formData, themePreference: 'minimal' as const};
                              setFormData(updated);
                              onSave(updated);
                           }}
                           className={`relative group rounded-xl border-2 overflow-hidden text-left transition-all ${formData.themePreference === 'minimal' ? 'border-white shadow-lg' : 'border-slate-800 hover:border-slate-600'}`}
                         >
                            <div className="h-24 bg-[#111] relative">
                               <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800/50 rounded-full border border-slate-700"></div>
                               <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-2 bg-slate-800/30 rounded"></div>
                            </div>
                            <div className="p-3 bg-[#0a0c10]">
                               <div className="flex justify-between items-center">
                                  <span className={`text-sm font-bold ${formData.themePreference === 'minimal' ? 'text-white' : 'text-white'}`}>Minimal</span>
                                  {formData.themePreference === 'minimal' && <i className="fa-solid fa-circle-check text-white text-xs"></i>}
                               </div>
                               <p className="text-[10px] text-slate-500 mt-1">Clean. Dark.</p>
                            </div>
                         </button>

                         {/* Light Option */}
                         <button 
                           onClick={() => {
                              const updated = {...formData, themePreference: 'light' as const};
                              setFormData(updated);
                              onSave(updated);
                           }}
                           className={`relative group rounded-xl border-2 overflow-hidden text-left transition-all ${formData.themePreference === 'light' ? 'border-blue-500 shadow-lg' : 'border-slate-800 hover:border-slate-600'}`}
                         >
                            <div className="h-24 bg-slate-100 relative">
                               <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-white rounded-full border border-slate-200 shadow-sm"></div>
                               <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-2 bg-slate-300 rounded"></div>
                            </div>
                            <div className="p-3 bg-[#0a0c10]">
                               <div className="flex justify-between items-center">
                                  <span className={`text-sm font-bold ${formData.themePreference === 'light' ? 'text-blue-400' : 'text-white'}`}>Light</span>
                                  {formData.themePreference === 'light' && <i className="fa-solid fa-circle-check text-blue-400 text-xs"></i>}
                               </div>
                               <p className="text-[10px] text-slate-500 mt-1">Bright. Focus.</p>
                            </div>
                         </button>
                      </div>
                   </div>

                   <div>
                      <h3 className="text-lg font-medium text-white mb-4">Text Size ({formData.textSize}%)</h3>
                      <div className="flex items-center gap-4 bg-black border border-slate-800 p-4 rounded-xl">
                         <span className="text-xs text-slate-500">Aa</span>
                         <input 
                           type="range" 
                           min="75" 
                           max="150" 
                           step="5"
                           value={formData.textSize}
                           onChange={(e) => {
                             const updated = {...formData, textSize: parseInt(e.target.value)};
                             setFormData(updated);
                             onSave(updated);
                           }}
                           className="flex-1 accent-aether-accent h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                         />
                         <span className="text-xl text-white">Aa</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Adjusts the reading size of chat messages.</p>
                   </div>
                </div>
             )}

             {/* --- BEHAVIOR TAB --- */}
             {activeTab === 'behavior' && (
               <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                     <label className="block text-sm font-medium text-slate-300 mb-2">System Instructions (Bio)</label>
                     <p className="text-xs text-slate-500 mb-3">What should the AI know about you?</p>
                     <textarea 
                        value={formData.aboutMe}
                        onChange={(e) => setFormData({...formData, aboutMe: e.target.value})}
                        className="w-full h-32 bg-black border border-slate-800 rounded-xl p-4 text-sm text-white focus:border-aether-accent focus:outline-none resize-none"
                        placeholder="I am a software engineer..."
                     />
                  </div>
                  
                  <div>
                     <label className="block text-sm font-medium text-slate-300 mb-2">Response Preference</label>
                     <p className="text-xs text-slate-500 mb-3">How should the AI respond?</p>
                     <textarea 
                        value={formData.customInstructions}
                        onChange={(e) => setFormData({...formData, customInstructions: e.target.value})}
                        className="w-full h-32 bg-black border border-slate-800 rounded-xl p-4 text-sm text-white focus:border-aether-accent focus:outline-none resize-none"
                        placeholder="Be concise. Use tables where possible..."
                     />
                  </div>

                  <div className="flex justify-end">
                     <button onClick={handleSave} className="bg-white text-black font-bold px-6 py-2 rounded-lg hover:bg-slate-200 transition-colors">
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                     </button>
                  </div>
               </div>
             )}

             {/* --- CONNECTED APPS TAB --- */}
             {activeTab === 'connected' && (
                <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                   <p className="text-slate-400 text-sm mb-6">Connect your accounts to allow Aether Lens to search your personal data silos.</p>
                   
                   {formData.connectedApps && Object.values(formData.connectedApps).map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                               <i className={`fa-brands ${app.icon} ${app.color} text-lg`}></i>
                            </div>
                            <div>
                               <div className="text-white font-medium">{app.name}</div>
                               <div className="text-xs text-slate-500">
                                  {app.isConnected 
                                    ? `Synced ${new Date(app.lastSynced || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                                    : app.description}
                               </div>
                            </div>
                         </div>
                         <button 
                           onClick={() => toggleAppConnection(app.id)}
                           disabled={connectingAppId === app.id}
                           className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all min-w-[100px] flex justify-center
                              ${app.isConnected 
                                 ? 'bg-transparent border-slate-600 text-slate-300 hover:text-red-400 hover:border-red-400' 
                                 : 'bg-white text-black border-transparent hover:bg-slate-200'
                              }`}
                         >
                            {connectingAppId === app.id ? (
                               <i className="fa-solid fa-circle-notch fa-spin"></i>
                            ) : (
                               app.isConnected ? 'Disconnect' : 'Connect'
                            )}
                         </button>
                      </div>
                   ))}
                </div>
             )}

             {/* --- DATA TAB --- */}
             {activeTab === 'data' && (
               <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between">
                     <div>
                        <h3 className="text-white font-medium">AI Model Training</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-md">Allow anonymized interaction data to be used to improve future Aether models.</p>
                     </div>
                     <div 
                        onClick={() => {
                           const newVal = !formData.allowDataTraining;
                           const updated = {...formData, allowDataTraining: newVal};
                           setFormData(updated);
                           onSave(updated);
                        }}
                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${formData.allowDataTraining ? 'bg-green-500' : 'bg-slate-700'}`}
                     >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.allowDataTraining ? 'translate-x-6' : 'translate-x-0'}`}></div>
                     </div>
                  </div>
                  
                  <hr className="border-slate-800" />

                  <div>
                     <h3 className="text-red-400 font-bold mb-4 text-sm uppercase tracking-widest">Danger Zone</h3>
                     <div className="bg-red-950/10 border border-red-900/30 rounded-xl p-4 flex items-center justify-between">
                        <div>
                           <div className="text-red-200 font-medium">Delete All Chat History</div>
                           <div className="text-xs text-red-400/60 mt-1">Permanently remove all sessions from local storage.</div>
                        </div>
                        <button onClick={handleClear} className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg text-sm transition-colors">
                           Delete All
                        </button>
                     </div>
                  </div>
               </div>
             )}

           </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
    