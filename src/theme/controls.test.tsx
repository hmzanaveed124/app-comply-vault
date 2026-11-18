import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { ConfigProvider } from "antd";
import { ThemeProvider, ThemeToggle } from "./provider";
import { createAppTheme, getThemeVariables } from "./config";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "~/components/ui/sheet";
afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});
const wrap = (children: React.ReactNode) =>
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <ThemeProvider>{children}</ThemeProvider>
    </ConfigProvider>,
  );
describe("shared Ant Design controls", () => {
  it("keeps primary and page colours in sync with the resolved theme", () => {
    for (const mode of ["light", "dark"] as const) {
      const vars = getThemeVariables(mode);
      expect(vars["--primary"]).toBe(vars["--cv-brand"]);
      expect(vars["--card"]).toBe(createAppTheme(mode).token?.colorBgContainer);
      expect(Object.values(vars)).not.toContain("undefined");
    }
    expect(getThemeVariables("light")["--background"]).not.toBe(
      getThemeVariables("dark")["--background"],
    );
  });
  it("switches the theme and persists the preference", async () => {
    wrap(<ThemeToggle />);
    await userEvent.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("complyvault-theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeTruthy();
  });
  it("preserves native input refs and button submit behaviour", async () => {
    const ref = createRef<HTMLInputElement>();
    const save = vi.fn();
    wrap(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save(new FormData(event.currentTarget).get("reviewer"));
        }}
      >
        <Input ref={ref} name="reviewer" aria-label="Reviewer" />
        <Button type="submit">Save</Button>
        <Button asChild>
          <a href="/settings">Settings</a>
        </Button>
      </form>,
    );
    expect(ref.current?.tagName).toBe("INPUT");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Reviewer" }),
      "Test reviewer",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(save).toHaveBeenCalledWith("Test reviewer");
    expect(
      screen.getByRole("link", { name: "Settings" }).getAttribute("href"),
    ).toBe("/settings");
  });
  it("selects options by keyboard and submits the selected native form value", async () => {
    const save = vi.fn();
    wrap(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save(new FormData(event.currentTarget).get("status"));
        }}
      >
        <Select name="status" defaultValue="pending">
          <SelectTrigger id="status">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="unavailable" disabled>
              Unavailable
            </SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Save</Button>
      </form>,
    );
    const select = screen.getByRole("combobox");
    fireEvent.keyDown(select, { key: "ArrowDown", keyCode: 40 });
    fireEvent.keyDown(select, { key: "ArrowDown", keyCode: 40 });
    fireEvent.keyDown(select, { key: "Enter", keyCode: 13 });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(save).toHaveBeenCalledWith("approved");
  });
  it("opens and closes a labelled dialog without unmounting its trigger", async () => {
    wrap(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open record</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Evidence record</DialogTitle>
          <DialogDescription>Review the record</DialogDescription>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open record" }));
    expect(
      screen.getByRole("dialog", { name: "Evidence record" }),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Open record" })).toBeTruthy();
  });
  it("renders the mobile navigation in an Ant drawer", async () => {
    wrap(
      <Sheet>
        <SheetTrigger asChild>
          <Button>Open navigation</Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetTitle>Navigation</SheetTitle>
          <a href="/dashboard">Dashboard</a>
        </SheetContent>
      </Sheet>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Open navigation" }),
    );
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("changes panels with Ant Design tabs", async () => {
    wrap(
      <Tabs defaultValue="prepare">
        <TabsList>
          <TabsTrigger value="prepare">Prepare</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>
        <TabsContent value="prepare">Preparation notes</TabsContent>
        <TabsContent value="review">Evidence notes</TabsContent>
      </Tabs>,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Review" }));
    expect(
      screen.getByRole("tab", { name: "Review" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByText("Evidence notes")).toBeTruthy();
  });
});
