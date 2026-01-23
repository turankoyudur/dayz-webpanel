export default function ServerControlsCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">
        Server Controls
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="btn-primary px-4 py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-primary/20">
          Restart Server
        </button>
        <button className="btn-primary px-4 py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-primary/20">
          Save World
        </button>
        <button className="btn-secondary px-4 py-3 rounded-lg font-semibold">
          Broadcast Message
        </button>
        <button className="btn-secondary px-4 py-3 rounded-lg font-semibold">
          View Logs
        </button>
      </div>
    </div>
  );
}
