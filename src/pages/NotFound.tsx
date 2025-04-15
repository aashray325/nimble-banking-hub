
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { CreditCard, XCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-banking-background p-4">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-4 flex flex-col items-center">
          <XCircle className="h-24 w-24 text-red-500" />
          <CreditCard className="relative -mt-10 h-12 w-12 text-banking-primary" />
        </div>
        <h1 className="mb-4 text-4xl font-bold text-banking-text">404</h1>
        <p className="mb-6 max-w-md text-xl text-banking-text-light">
          Oops! The page you're looking for doesn't exist in our banking system.
        </p>
        <Button className="px-8" asChild>
          <a href="/">Return to Home</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
