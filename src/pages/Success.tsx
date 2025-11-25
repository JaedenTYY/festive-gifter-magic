import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, CheckCircle } from "lucide-react";

const Success = () => {
  const { eventId } = useParams();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-festive">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-accent" />
          </div>
          <CardTitle className="text-2xl">Successfully Registered! 🎄</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            You've successfully joined the Secret Santa event! Once the host runs the draw,
            you'll receive an email with your assignment and wishlist details.
          </p>
          <div className="pt-4">
            <Gift className="h-12 w-12 text-primary mx-auto animate-bounce" />
          </div>
          <p className="text-sm text-muted-foreground">
            Check your email after the draw for your Secret Santa assignment and chat link!
          </p>
          <Link to="/">
            <Button className="w-full bg-gradient-hero hover:opacity-90 transition-all">
              Create Your Own Event
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
