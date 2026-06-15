import { motion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import Avatar from "../ui/Avatar";

/**
 * A single chat message bubble.
 * Props:
 *  - message: { _id, text, createdAt, sender:{_id,firstName,lastName,avatar}, readBy:[{user,readAt}] }
 *  - mine: bool (true if sent by current user)
 *  - currentUserId: string
 *  - otherCount: number of OTHER members in the room (for seen-by-all calc)
 *  - showSender: bool (show name+avatar for others; used for grouping)
 */
export default function MessageBubble({
  message,
  mine,
  currentUserId,
  otherCount = 0,
  showSender = true,
}) {
  const time = message.createdAt
    ? format(new Date(message.createdAt), "HH:mm")
    : "";

  // For my messages: how many OTHER people have read it.
  const readers = Array.isArray(message.readBy)
    ? message.readBy.filter(
        (r) => String(r.user?._id || r.user) !== String(currentUserId)
      ).length
    : 0;
  const seenByAll = otherCount > 0 && readers >= otherCount;

  const sender = message.sender || {};
  const senderName = sender.firstName || "Member";

  if (mine) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="flex w-full justify-end"
      >
        <div className="flex max-w-[80%] flex-col items-end sm:max-w-[70%]">
          <div className="rounded-2xl rounded-br-md bg-gradient-to-r from-brand-600 to-indigo-500 px-3.5 py-2.5 text-white shadow-sm">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
              {message.text}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-1 px-1 text-[11px] text-slate-400">
            <span>{time}</span>
            {message.pending ? (
              <Check className="h-3.5 w-3.5 text-slate-300" />
            ) : seenByAll ? (
              <span className="flex items-center gap-0.5 text-brand-500">
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="font-medium">Seen</span>
              </span>
            ) : (
              <Check className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="flex w-full justify-start"
    >
      <div className="flex max-w-[82%] items-end gap-2 sm:max-w-[72%]">
        <div className="w-8 shrink-0">
          {showSender ? (
            <Avatar user={sender} size={32} />
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>
        <div className="flex flex-col items-start">
          {showSender && (
            <span className="mb-1 px-1 text-xs font-semibold text-brand-600">
              {senderName}
            </span>
          )}
          <div className="rounded-2xl rounded-bl-md border border-slate-100 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
              {message.text}
            </p>
          </div>
          <span className="mt-1 px-1 text-[11px] text-slate-400">{time}</span>
        </div>
      </div>
    </motion.div>
  );
}
