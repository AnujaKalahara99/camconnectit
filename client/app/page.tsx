import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Camera, Laptop, Smartphone, Wifi } from "lucide-react";
import Background from "./components/background";
import QR from "./components/qr";

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden mx-5 lg:mx-20">
      <Background />

      <header className="container mx-auto py-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-slate-700 to-indigo-600 text-white">
              <Camera className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-indigo-600 bg-clip-text text-transparent">
              CameraConnect
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing">
              <Button
                variant="ghost"
                className="text-gray-700 dark:text-gray-300"
              >
                Pricing
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-gray-700 dark:text-gray-300"
              >
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-slate-700 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white border-0">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 relative z-10">
        <section className="mb-20 text-center">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-700 via-indigo-600 to-teal-600 bg-clip-text text-transparent sm:text-5xl md:text-6xl">
            Connect Your Phone Camera to Your Laptop
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600 dark:text-gray-400">
            Instantly capture and transfer photos and videos from your phone to
            your laptop with a simple QR code scan.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/connect">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-slate-700 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white border-0 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-slate-200 dark:border-slate-800 text-gray-700 dark:text-gray-300"
              >
                How It Works
              </Button>
            </Link>
          </div>
        </section>

        <section className="mb-20 w-full flex items-center justify-center">
          <div className="rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-8 shadow-xl shadow-slate-100 dark:shadow-slate-900/10 border border-slate-100 dark:border-slate-800">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex flex-col justify-center">
                <h2 className="mb-4 text-3xl font-bold bg-gradient-to-r from-slate-700 to-indigo-600 bg-clip-text text-transparent">
                  How It Works
                </h2>
                <ol className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-slate-700 to-indigo-600 text-sm font-medium text-white">
                      1
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Make sure your phone and laptop are connected to the same
                      WiFi
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-slate-700 to-indigo-600 text-sm font-medium text-white">
                      2
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Scan the QR code on your laptop screen with your phone
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-slate-700 to-indigo-600 text-sm font-medium text-white">
                      3
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Allow camera access on your phone
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-slate-700 to-indigo-600 text-sm font-medium text-white">
                      4
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Take photos send files using the web interface
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-slate-700 to-indigo-600 text-sm font-medium text-white">
                      5
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Media appears instantly on your laptop
                    </p>
                  </li>
                </ol>
              </div>
              <div className="flex items-center justify-center p-10">
                <div className="relative h-64 w-64 overflow-visible rounded-xl bg-gradient-to-br from-slate-100 to-indigo-100 dark:from-slate-800/50 dark:to-indigo-900/30 p-1">
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800">
                    <QR />

                    {/* <img
                      src="/placeholder.svg?height=256&width=256"
                      alt="QR code scanning demonstration"
                      className="h-full w-full object-cover"
                    /> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="overflow-hidden border-0 shadow-lg shadow-slate-100 dark:shadow-slate-900/10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
              <div className="h-2 bg-gradient-to-r from-teal-500 to-indigo-500"></div>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-indigo-500 text-white">
                  <Wifi className="h-6 w-6" />
                </div>
                <CardTitle className="text-gray-800 dark:text-gray-100">
                  Connect via Local WiFi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Both devices need to be on the same WiFi network. No internet
                  required - everything happens locally.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg shadow-slate-100 dark:shadow-slate-900/10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
              <div className="h-2 bg-gradient-to-r from-indigo-500 to-slate-600"></div>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-slate-600 text-white">
                  <Smartphone className="h-6 w-6" />
                </div>
                <CardTitle className="text-gray-800 dark:text-gray-100">
                  Capture Media
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Take photos and videos directly from your phone's camera with
                  full resolution and quality.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-lg shadow-slate-100 dark:shadow-slate-900/10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
              <div className="h-2 bg-gradient-to-r from-slate-600 to-teal-500"></div>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-slate-600 to-teal-500 text-white">
                  <Laptop className="h-6 w-6" />
                </div>
                <CardTitle className="text-gray-800 dark:text-gray-100">
                  Instant Transfer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Media appears instantly on your laptop. Save, copy, or share
                  directly to other applications.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="text-center">
          <h2 className="mb-4 text-3xl font-bold bg-gradient-to-r from-slate-700 to-indigo-600 bg-clip-text text-transparent">
            Ready to Connect?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600 dark:text-gray-400">
            Start capturing and sharing media between your devices in seconds.
          </p>
          <Link href="/connect">
            <Button
              size="lg"
              className="gap-2 bg-gradient-to-r from-slate-700 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white border-0 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
            >
              Connect Now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white/90 py-8 dark:border-slate-800 dark:bg-gray-900/90 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-slate-700 to-indigo-600 text-white">
                <Camera className="h-3 w-3" />
              </div>
              <p className="text-sm text-gray-500">
                © 2025 CameraConnect. All rights reserved.
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/privacy"
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
