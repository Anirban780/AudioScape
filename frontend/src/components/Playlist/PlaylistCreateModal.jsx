import React, { useState } from "react";
import { X, ListMusic, Plus, Loader2 } from "lucide-react";

/**
 * ============================================================================
 * PLAYLIST CREATE MODAL (PlaylistCreateModal.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * A full-screen modal dialog for creating a new user playlist.
 * Supports:
 * - Playlist name (required, max 100 chars)
 * - Optional description (max 500 chars)
 * - Loading state during API call
 * - Focus trap on the input on open
 * - Dismiss on backdrop click or Escape key
 *
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Separate from PlaylistModal: PlaylistModal is for "Add Track to Playlist".
 *    This modal is for CREATING a brand-new standalone playlist — keeping
 *    responsibilities separated and the UX intent clear.
 * 2. Brand Purple Accents: Input focus rings and buttons use var(--color-primary)
 *    (purple) to align with the Playlists page theme.
 * 3. Accessible: Escape key closes the modal, and the first input is auto-focused.
 *
 * PROPS:
 * - isOpen: Boolean controlling modal visibility
 * - onClose: Callback to close the modal
 * - onCreate: Async callback(name, description) that creates the playlist
 */
const PlaylistCreateModal = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [nameError, setNameError] = useState("");

    // Reset form state on close
    const handleClose = () => {
        setName("");
        setDescription("");
        setNameError("");
        setIsLoading(false);
        onClose();
    };

    /**
     * Handles form submission: validates, calls onCreate(), and closes on success.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = name.trim();

        if (!trimmedName) {
            setNameError("Playlist name is required.");
            return;
        }
        if (trimmedName.length > 100) {
            setNameError("Playlist name must be 100 characters or fewer.");
            return;
        }

        setNameError("");
        setIsLoading(true);

        try {
            await onCreate(trimmedName, description.trim());
            handleClose();
        } catch (err) {
            // Error toasts are handled by the parent; just re-enable the form
            setIsLoading(false);
        }
    };

    /**
     * Closes the modal when clicking the backdrop (outside the dialog box).
     */
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) handleClose();
    };

    /**
     * Closes modal on Escape key press.
     */
    const handleKeyDown = (e) => {
        if (e.key === "Escape") handleClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleBackdropClick}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="playlist-create-modal-title"
        >
            <div className="relative w-full max-w-md rounded-3xl bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] shadow-2xl p-6 sm:p-7 animate-in fade-in slide-in-from-bottom-4 duration-300">

                {/* Close Button */}
                <button
                    className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--color-on-surface-variant)] hover:bg-[var(--color-state-hover)] hover:text-[var(--color-on-surface)] transition-colors cursor-pointer"
                    onClick={handleClose}
                    aria-label="Close modal"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/20 flex items-center justify-center">
                        <ListMusic size={20} className="text-[var(--color-primary)]" />
                    </div>
                    <div>
                        <h2
                            id="playlist-create-modal-title"
                            className="text-lg font-extrabold text-[var(--color-on-surface)] tracking-tight"
                        >
                            Create Playlist
                        </h2>
                        <p className="text-xs text-[var(--color-on-surface-variant)]">
                            Give your playlist a name to get started
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {/* Playlist Name Field */}
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="playlist-name"
                            className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider"
                        >
                            Name <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <input
                            id="playlist-name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (nameError) setNameError("");
                            }}
                            placeholder="e.g. Late Night Lofi Vibes"
                            maxLength={100}
                            autoFocus
                            className={`w-full px-4 py-3 rounded-xl text-sm bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border transition-all placeholder:text-[var(--color-on-surface-variant)]/50 focus:outline-none focus:ring-2 ${
                                nameError
                                    ? "border-red-500 focus:ring-red-500/40"
                                    : "border-[var(--color-border-default)] focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]"
                            }`}
                        />
                        {/* Character Counter */}
                        <div className="flex items-center justify-between">
                            {nameError ? (
                                <span className="text-[11px] text-red-500 font-medium">{nameError}</span>
                            ) : (
                                <span />
                            )}
                            <span className={`text-[11px] ml-auto ${name.length > 90 ? "text-amber-500" : "text-[var(--color-on-surface-variant)]/50"}`}>
                                {name.length}/100
                            </span>
                        </div>
                    </div>

                    {/* Optional Description Field */}
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="playlist-description"
                            className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider"
                        >
                            Description{" "}
                            <span className="font-normal normal-case text-[var(--color-on-surface-variant)]/60">(optional)</span>
                        </label>
                        <textarea
                            id="playlist-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this playlist about?"
                            maxLength={500}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border border-[var(--color-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-on-surface-variant)]/50 resize-none"
                        />
                        <span className={`text-[11px] self-end ${description.length > 450 ? "text-amber-500" : "text-[var(--color-on-surface-variant)]/50"}`}>
                            {description.length}/500
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 mt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-state-hover)] transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[var(--color-primary)]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Plus size={15} />
                                    <span>Create</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PlaylistCreateModal;
