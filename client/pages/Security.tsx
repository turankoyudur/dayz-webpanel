import Placeholder from "./Placeholder";
import { Shield } from "lucide-react";

export default function Security() {
  return (
    <Placeholder
      title="Security Management"
      description="Manage server security, whitelist/blacklist, anti-cheat settings, and view security logs."
      icon={<Shield />}
    />
  );
}
