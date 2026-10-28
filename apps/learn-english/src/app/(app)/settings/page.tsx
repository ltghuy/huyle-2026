import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { ClipboardCheck, Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppearanceSetting } from "@/components/settings/appearance-setting";
import { BackupPanel } from "@/components/settings/backup-panel";
import { BackupReminder } from "@/components/settings/backup-reminder";
import { LeaderboardSetting } from "@/components/leaderboard/leaderboard-setting";
import { LevelSetting } from "@/components/settings/level-setting";
import { NameSetting } from "@/components/settings/name-setting";
import { SoundToggle } from "@/components/settings/sound-toggle";
import { StatsToggle } from "@/components/settings/stats-toggle";
import { SyncPanel } from "@/components/settings/sync-panel";
import { PageHeader } from "@/components/shell/page-header";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({ title: "Cài đặt", path: "/settings", description: "Tên, trình độ, giao diện, âm thanh, sao lưu, đồng bộ, bảng xếp hạng và hướng dẫn.", index: false });

const LINK_BUTTON = cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4");

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Cài đặt" description="Tên, trình độ, giao diện, âm thanh, sao lưu, đồng bộ, bảng xếp hạng và hướng dẫn." />
      <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 md:mx-0 md:px-8">
        <BackupReminder />
        <Card>
          <CardHeader>
            <CardTitle>Tên của bạn</CardTitle>
          </CardHeader>
          <CardContent>
            <NameSetting />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trình độ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <LevelSetting />
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">Chưa chắc trình độ của mình? Làm bài kiểm tra ngắn để ứng dụng gợi ý.</p>
              <div>
                <Link href="/placement" className={LINK_BUTTON}>
                  <ClipboardCheck aria-hidden /> Làm lại bài kiểm tra trình độ
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Giao diện</CardTitle>
          </CardHeader>
          <CardContent>
            <AppearanceSetting />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Âm thanh</CardTitle>
          </CardHeader>
          <CardContent>
            <SoundToggle />
          </CardContent>
        </Card>

        <BackupPanel />

        <SyncPanel />

        <Card>
          <CardHeader>
            <CardTitle>Bảng xếp hạng tuần</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaderboardSetting />
          </CardContent>
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
