import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackupPanel } from "@/components/settings/backup-panel";
import { BackupReminder } from "@/components/settings/backup-reminder";
import { LevelSetting } from "@/components/settings/level-setting";
import { StatsToggle } from "@/components/settings/stats-toggle";
import { PageHeader } from "@/components/shell/page-header";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cài đặt" };

const LINK_BUTTON = cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4");

export default function CaiDatPage() {
  return (
    <>
      <PageHeader title="Cài đặt" description="Trình độ, sao lưu, đồng bộ và hướng dẫn." />
      <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 md:mx-0 md:px-8">
        <BackupReminder />
        <Card>
          <CardHeader>
            <CardTitle>Trình độ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <LevelSetting />
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">Chưa chắc trình độ của mình? Làm bài kiểm tra ngắn để ứng dụng gợi ý.</p>
              <div>
                <Link href="/kiem-tra-trinh-do" className={LINK_BUTTON}>
                  <ClipboardCheck aria-hidden /> Làm lại bài kiểm tra trình độ
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <BackupPanel />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Đồng bộ <Badge variant="secondary">Sắp có</Badge>
            </CardTitle>
            <CardDescription>Dùng một mã để giữ tiến độ giống nhau trên nhiều thiết bị. Tính năng này sắp có.</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hướng dẫn và quyền riêng tư</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">Xem lại các phần chính của ứng dụng, từng bước một.</p>
              <div>
                <Link href="/?tour=1" className={LINK_BUTTON}>
                  <Compass aria-hidden /> Xem lại hướng dẫn
                </Link>
              </div>
            </div>
            <StatsToggle />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
