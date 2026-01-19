import { useState } from 'react';
import { registerUser, loginUser, fetchCapabilities, fetchWorkflows } from '../lib/api';
import { encryptPassword, decryptPassword } from '../lib/security';
import type { Message } from '../types';

interface UseMobileAuthProps {
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setSavedAccountName: (name: string) => void;
}

export function useMobileAuth({ setMessages, setSavedAccountName }: UseMobileAuthProps) {
    const [showLoginRegister, setShowLoginRegister] = useState(false);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [showPinLogin, setShowPinLogin] = useState(false);
    const [showAccountSelector, setShowAccountSelector] = useState(false);
    const [pendingRegData, setPendingRegData] = useState<{name: string, pwd: string, uid: string} | null>(null);

    const handleRegister = async (username: string, password: string, phone: string) => {
        try {
            const result = await registerUser(username, password, phone);
            console.log("Registration result:", result);

            setPendingRegData({
                name: username,
                pwd: password,
                uid: result.uid
            });
            setShowLoginRegister(false); // 关闭注册对话框
            setShowPinSetup(true); 
        } catch (err: any) {
            console.error(err);
            throw err; 
        }
    };

    const handlePinSetupSuccess = async (pin: string) => {
        if (!pendingRegData) return;
        
        try {
            const encryptedPwd = await encryptPassword(pendingRegData.pwd, pin);
            
            const profile = {
                name: pendingRegData.name,
                uid: pendingRegData.uid,
                security: encryptedPwd 
            };
            
            localStorage.setItem("chat_user_profile", JSON.stringify(profile));
            setSavedAccountName(pendingRegData.name);
            
            setPendingRegData(null);
            setShowPinSetup(false);
            
            const successMsg: Message = {
                id: Date.now().toString(),
                type: "text",
                content: `PIN设置成功！验证通过！欢迎你，${pendingRegData.name}。`,
                sender: "system",
                timestamp: Date.now(),
            };
            setMessages([successMsg]);
        } catch (e: any) {
            console.error("PIN Setup Failed:", e);
            const errorMsg: Message = {
                id: Date.now().toString(),
                type: "text",
                content: `PIN设置失败: ${e.message}`,
                sender: "system",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
        }
    };

    const handlePinLoginSuccess = async (pin: string) => {
        const userProfileStr = localStorage.getItem("chat_user_profile");
        if (!userProfileStr) return false;
        
        try {
            const profile = JSON.parse(userProfileStr);
            if (profile.security) {
                const pwd = await decryptPassword(profile.security, pin);
                if (pwd) {
                    try {
                        await loginUser(profile.name, pwd);

                        try {
                            const [caps, workflows] = await Promise.all([
                                fetchCapabilities(),
                                fetchWorkflows()
                            ]);

                            // Merge workflow definitions into capabilities for unified lookup
                            // system.workflow.published returns a direct array of AI-optimized workflows
                            const workflowList = Array.isArray(workflows) ? workflows : [];
                            
                            workflowList.forEach((wf: any) => {
                                caps[wf.id] = {
                                    description: wf.name || wf.desc,
                                    params: (wf.required_inputs || []).map((name: string) => ({ name, required: true })),
                                    synonyms: wf.synonyms || {}
                                };
                            });

                            localStorage.setItem("chat_capabilities", JSON.stringify(caps));
                            localStorage.setItem("chat_workflows", JSON.stringify(workflowList));
                            console.log("Abilities cached:", Object.keys(caps).length);
                        } catch (capErr) {
                            console.warn("Failed to cache capabilities/workflows:", capErr);
                        }
                        
                        setShowPinLogin(false);
                        console.log("Quick Login & API Auth Successful");
                        
                        const welcomeMsg: Message = {
                            id: Date.now().toString(),
                            type: "text",
                            content: `欢迎回来，${profile.name}！`,
                            sender: "system",
                            timestamp: Date.now(),
                        };

                        setMessages([welcomeMsg]);
                        return true;
                    } catch (apiErr: any) {
                        console.error("API Login Failed:", apiErr);
                        
                        if (apiErr.message && apiErr.message.includes('Forbidden')) {
                            setShowPinLogin(false);
                            
                            const errorMsg: Message = {
                                id: Date.now().toString(),
                                type: "text",
                                content: `抱歉，您的账号 "${profile.name}" 暂时无法登录。\n\n原因：权限不足\n\n请联系管理员为您的账号分配相应的访问权限。`,
                                sender: "system",
                                timestamp: Date.now(),
                            };
                            setMessages([errorMsg]); // Clear previous messages? Original code was setMessages([errorMsg])? No, strictly logic: setMessages([errorMsg]) replaces all messages? 
                            // Ah in original code lines 304: setMessages([errorMsg]); Yes it replaces. 
                            
                            localStorage.removeItem("chat_user_profile");
                            return false;
                        }
                        return false;
                    }
                }
            } else {
                 setShowPinLogin(false);
                 return true;
            }
        } catch (e) {
           console.error("PIN Verification Failed:", e);
           return false;
        }
        return false;
    };

    const handleUseSavedAccount = () => {
        setShowAccountSelector(false);
        setShowPinLogin(true);
    };
  
    const handleUseOtherAccount = () => {
        setShowAccountSelector(false);
        localStorage.removeItem("chat_user_profile");
        const loginPromptMsg: Message = {
          id: Date.now().toString(),
          type: "text",
          content: "请先注册或登录您的账号 👇",
          sender: "system",
          timestamp: Date.now(),
        };
        const regDialogMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: "edit_dialog",
          content: "点击登录或注册",
          sender: "system",
          timestamp: Date.now() + 1,
          payload: {
            title: "用户登录/注册",
            buttonText: "开始使用",
            fields: []
          }
        };
        setMessages([loginPromptMsg, regDialogMsg]);
    };

    return {
        showLoginRegister, setShowLoginRegister,
        showPinSetup, setShowPinSetup,
        showPinLogin, setShowPinLogin,
        showAccountSelector, setShowAccountSelector,
        pendingRegData, setPendingRegData,
        handleRegister,
        handlePinSetupSuccess,
        handlePinLoginSuccess,
        handleUseSavedAccount,
        handleUseOtherAccount
    };
}
