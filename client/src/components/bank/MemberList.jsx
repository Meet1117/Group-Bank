import React from "react";
import { motion } from "framer-motion";
import { Crown, Circle } from "lucide-react";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { useSocket } from "../../context/SocketContext";

function memberName(u) {
  if (!u) return "Member";
  const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
  return name || u.email || "Member";
}

/**
 * MemberList
 * props:
 *  - members: array of { user:{_id,firstName,lastName,avatar,email}, joinedAt }
 *  - adminId: string id of the room admin
 *  - me: current user object
 */
export default function MemberList({ members, adminId, me }) {
  const { onlineUsers } = useSocket();
  const list = Array.isArray(members) ? members : [];
  const myId = me && (me._id || me.id) ? String(me._id || me.id) : null;
  const adminStr = adminId ? String(adminId) : null;

  return (
    <Card className="px-4 py-1">
      <ul className="divide-y divide-slate-100">
        {list.map((m, idx) => {
          const u = m.user || m;
          const uid = u && u._id ? String(u._id) : null;
          const isAdmin = adminStr && uid === adminStr;
          const isMe = myId && uid === myId;
          const online =
            onlineUsers && uid ? onlineUsers.has(uid) : false;

          return (
            <motion.li
              key={uid || idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03, type: "spring", stiffness: 240, damping: 24 }}
              className="flex items-center gap-3 py-3"
            >
              <div className="relative">
                <Avatar user={u} size={42} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                    online ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  title={online ? "Online" : "Offline"}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {memberName(u)}
                  </span>
                  {isMe && (
                    <span className="text-xs font-normal text-brand-600">
                      (you)
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {u && u.email ? u.email : ""}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {online && (
                  <span className="hidden items-center gap-1 text-xs text-emerald-600 sm:inline-flex">
                    <Circle size={8} className="fill-emerald-500 text-emerald-500" />
                    Online
                  </span>
                )}
                {isAdmin ? (
                  <Badge color="brand">
                    <span className="inline-flex items-center gap-1">
                      <Crown size={12} />
                      Admin
                    </span>
                  </Badge>
                ) : (
                  <Badge color="slate">Member</Badge>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}
