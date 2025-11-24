"use client";

import { useState } from "react";
import { X, Edit, Save, Loader } from "lucide-react";
import { UserProfile, useUserStats } from "@/hooks/useUserStats";
import StatsDisplay from "./StatsDisplay";
import AchievementsList from "./AchievementsList";

interface Props {
    profile: UserProfile;
    updateUsername: (newUsername: string) => Promise<void>;
    onClose: () => void;
}

const ProfileModal: React.FC<Props> = ({ profile, updateUsername, onClose }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState(profile.username);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (username === profile.username) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        await updateUsername(username);
        setIsSaving(false);
        setIsEditing(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">Your Profile</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Username */}
                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="flex-grow bg-slate-800 text-white px-3 py-2 rounded-lg text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        ) : (
                            <h3 className="text-2xl font-bold text-white">{profile.username}</h3>
                        )}
                        <button
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            className="bg-purple-600/50 hover:bg-purple-600/80 text-white p-2 rounded-full transition-colors disabled:opacity-50"
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader className="animate-spin" /> : isEditing ? <Save /> : <Edit />}
                        </button>
                    </div>

                    {/* Stats */}
                    <StatsDisplay stats={profile.stats} />

                    {/* Achievements */}
                    <AchievementsList achievements={profile.achievements} />
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
