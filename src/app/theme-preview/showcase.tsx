"use client";
import { useState } from "react";
import { ThemeToggle } from "~/theme/provider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { Alert, AlertDescription } from "~/components/ui/alert";
export function ThemeShowcase() {
  const [value, setValue] = useState("pending");
  const [submitted, setSubmitted] = useState("");
  return (
    <main className="min-h-screen bg-surface-page p-6 text-text-primary">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">ComplyVault design system</h1>
          <ThemeToggle />
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Review workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Delete</Button>
              <Button disabled>Disabled</Button>
              <Button asChild>
                <a href="#notes">Open notes</a>
              </Button>
            </div>
            <div className="flex gap-2">
              <Badge>Approved</Badge>
              <Badge variant="secondary">Pending</Badge>
              <Badge variant="destructive">Needs attention</Badge>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(
                  String(new FormData(event.currentTarget).get("status")),
                );
              }}
              className="space-y-3"
            >
              <label htmlFor="reviewer">Reviewer</label>
              <Input id="reviewer" placeholder="Reviewer name" required />
              <label htmlFor="status">Status</label>
              <Select name="status" value={value} onValueChange={setValue}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Choose status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="disabled" disabled>
                    Unavailable
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">Save review</Button>
              <span role="status">{submitted}</span>
            </form>
            <Textarea id="notes" placeholder="Review notes" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Review guidance</Button>
              </TooltipTrigger>
              <TooltipContent>Human review before finalising</TooltipContent>
            </Tooltip>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Open evidence</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Evidence record</DialogTitle>
                <DialogDescription>
                  Confirm the review outcome.
                </DialogDescription>
                <Input placeholder="Resolution" autoFocus />
                <Select defaultValue="pending">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
                <DialogClose asChild>
                  <Button>Done</Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        <Tabs defaultValue="prepare">
          <TabsList>
            <TabsTrigger value="prepare">Prepare</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
          </TabsList>
          <TabsContent value="prepare">
            Client context and meeting preparation
          </TabsContent>
          <TabsContent value="review">
            <Alert>
              <AlertDescription>Records waiting for review</AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
