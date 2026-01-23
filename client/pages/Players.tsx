import Placeholder from "./Placeholder";
import { Users } from "lucide-react";

export default function Players() {
  return (
    <Placeholder
      title="Players Management"
      description="Manage and monitor all players connected to your DayZ server. View detailed statistics, manage bans, and monitor gameplay."
      icon={<Users />}
    />
  );
}
