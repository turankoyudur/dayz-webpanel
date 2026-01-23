import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface PlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function Placeholder({
  title,
  description,
  icon,
}: PlaceholderProps) {
  return (
    <div className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-140px)]">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/20 mb-6">
          <div className="text-primary text-3xl">{icon}</div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground mb-8">{description}</p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
