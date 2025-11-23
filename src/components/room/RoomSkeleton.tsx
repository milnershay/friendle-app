import { Skeleton } from "@/components/ui/Skeleton";

export default function RoomSkeleton() {
  return (
    <main className="min-h-screen text-white flex flex-col md:flex-row safe-area-inset relative overflow-hidden bg-slate-900">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden glass p-3 flex justify-between items-center sticky top-0 z-10 safe-top border-b border-white/10">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="w-24 h-6" />
          <Skeleton className="w-16 h-4" />
        </div>
        <div className="flex gap-1 bg-black/20 rounded-lg p-1">
          <Skeleton className="w-20 h-8" />
          <Skeleton className="w-20 h-8" />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-80 glass md:border-r border-white/10 p-6 flex-col hidden md:flex">
        <Skeleton className="w-3/4 h-8 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-1/2 h-3" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="w-full h-10 mt-auto" />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 p-2 md:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="w-1/2 h-8 mx-auto" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <div className="flex justify-center gap-4 pt-4">
            <Skeleton className="w-24 h-10" />
            <Skeleton className="w-24 h-10" />
          </div>
        </div>
      </div>
    </main>
  );
}
