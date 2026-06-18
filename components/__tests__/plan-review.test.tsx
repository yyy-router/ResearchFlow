// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PlanReview } from "../plan-review";
import type { TodoItem } from "@/lib/types";

const baseItems: TodoItem[] = [
  { id: "todo-0", title: "[ai-funding] AI融资规模", status: "pending" },
  { id: "todo-1", title: "[company-analysis] 头部公司分析", status: "pending" },
];

beforeEach(() => {
  cleanup();
});

describe("PlanReview", () => {
  it("渲染全部子方向和操作按钮", () => {
    render(<PlanReview topic="测试主题" items={baseItems} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("[ai-funding] AI融资规模")).toBeDefined();
    expect(screen.getByText("[company-analysis] 头部公司分析")).toBeDefined();
    expect(screen.getByRole("button", { name: /开始执行/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /添加子方向/ })).toBeDefined();
  });

  it("默认全部子方向已勾选", () => {
    const onConfirm = vi.fn();
    render(<PlanReview topic="测试" items={baseItems} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /开始执行/ }));
    expect(onConfirm).toHaveBeenCalledWith(baseItems);
  });

  it("取消勾选的子方向不会被确认", () => {
    const onConfirm = vi.fn();
    render(<PlanReview topic="测试" items={baseItems} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: /开始执行/ }));
    expect(onConfirm).toHaveBeenCalledWith([baseItems[1]]);
  });

  it("点击添加按钮新增子方向", () => {
    render(<PlanReview topic="测试" items={baseItems} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /添加子方向/ }));
    expect(screen.getByPlaceholderText("输入子方向名称")).toBeDefined();
  });

  it("删除后不包含被删项", () => {
    const onConfirm = vi.fn();
    render(<PlanReview topic="测试" items={baseItems} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getAllByTitle("删除")[0]);
    fireEvent.click(screen.getByRole("button", { name: /开始执行/ }));
    expect(onConfirm).toHaveBeenCalledWith([baseItems[1]]);
  });

  it("全部取消后确认按钮禁用", () => {
    render(<PlanReview topic="测试" items={baseItems} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    const btn = screen.getByRole("button", { name: /开始执行/ });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("空标题的自定义项不参与确认", () => {
    const onConfirm = vi.fn();
    render(<PlanReview topic="测试" items={baseItems} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /添加子方向/ }));
    fireEvent.click(screen.getByRole("button", { name: /开始执行/ }));
    expect(onConfirm).toHaveBeenCalledWith(baseItems);
  });
});
