import { motion } from "framer-motion";

/**
 * Animated three-dot typing bubble.
 * Props:
 *  - users: array of { _id, firstName } currently typing (optional)
 *  - name: convenience single name string (optional, overrides users label)
 */
export default function TypingIndicator({ users = [], name }) {
  let label = name;
  if (!label) {
    if (users.length === 1) {
      label = `${users[0].firstName || "Someone"} is typing`;
    } else if (users.length === 2) {
      label = `${users[0].firstName || "Someone"} and ${
        users[1].firstName || "someone"
      } are typing`;
    } else if (users.length > 2) {
      label = `${users[0].firstName || "Someone"} and ${
        users.length - 1
      } others are typing`;
    } else {
      label = "typing";
    }
  }

  const dotTransition = {
    duration: 0.9,
    repeat: Infinity,
    ease: "easeInOut",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="flex items-end gap-2"
    >
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white border border-slate-100 px-3.5 py-2.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2 w-2 rounded-full bg-slate-400"
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ ...dotTransition, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span className="mb-1 text-xs font-medium text-slate-400">{label}</span>
    </motion.div>
  );
}
