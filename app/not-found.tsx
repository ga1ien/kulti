import Link from "next/link";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Text */}
        <h1 className="font-mono text-[150px] md:text-[200px] font-bold leading-none">
          <span className="text-primary">4</span>
          <span className="text-white">0</span>
          <span className="text-primary">4</span>
        </h1>

        {/* Message */}
        <div className="space-y-4">
          <h2 className="font-mono text-3xl md:text-4xl font-bold text-white">
            Page Not Found
          </h2>
          <p className="text-textSecondary text-lg max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link href="/dashboard">
            <Button variant="primary" size="lg" className="min-h-[44px] w-full sm:w-auto">
              Return to Dashboard
            </Button>
          </Link>
          <Link href="/browse">
            <Button variant="ghost" size="lg" className="min-h-[44px] w-full sm:w-auto">
              Browse Sessions
            </Button>
          </Link>
        </div>

        {/* Help Link */}
        <div className="pt-8">
          <p className="text-textMuted text-sm">
            Need help?{" "}
            <Link
              href="/settings"
              className="text-primary hover:underline transition-colors"
            >
              Visit Settings
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
