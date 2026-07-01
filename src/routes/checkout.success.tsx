import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export const Route = createFileRoute("/checkout/success")({
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Purchase Successful</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-muted-foreground">
            Thank you for your purchase! You now have full access to the exam.
          </p>
          <Link to="/exams">
            <Button className="w-full">Go to Exams</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
