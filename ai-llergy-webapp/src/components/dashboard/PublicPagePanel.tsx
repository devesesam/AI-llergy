"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Check, ExternalLink, Download, Smartphone } from "lucide-react";
import { Card, CardBody, Button, useToast } from "@/components/ui";

export function PublicPagePanel({ slug }: { slug: string }) {
  const toast = useToast();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}/v/${slug}` : `/v/${slug}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPng = () => {
    const canvas = qrWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ai-llergy-${slug}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded");
  };

  if (!slug) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-text-muted">
            Set a public URL slug in Settings to generate this venue&apos;s
            public page and QR code.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
      {/* Link + QR */}
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text">Public menu link</h3>
              <p className="text-sm text-text-muted mt-0.5">
                Diners use this to filter your menu by their allergies.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 min-w-0 truncate text-sm bg-muted-bg rounded-lg px-3 py-2 border border-border/60">
                {url}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={copy}
                icon={
                  copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
              >
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                href={`/v/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Open
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text">QR code</h3>
              <p className="text-sm text-text-muted mt-0.5">
                Print on table tents or menus so customers can scan to filter.
              </p>
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div
                ref={qrWrapRef}
                className="bg-white p-3 rounded-xl border border-border"
              >
                <QRCodeCanvas value={url} size={148} level="M" />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadPng}
                icon={<Download className="w-4 h-4" />}
              >
                Download PNG
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Phone preview */}
      <Card className="overflow-hidden">
        <CardBody>
          <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
            <Smartphone className="w-4 h-4" />
            Live preview
          </div>
          <div className="w-[280px] h-[560px] max-w-full rounded-[2rem] border-8 border-gray-900 overflow-hidden bg-white shadow-lg">
            <iframe
              src={`/v/${slug}`}
              title="Public menu preview"
              className="w-full h-full"
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
