"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const Home = () => {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="w-full max-w-[1200px] px-4 py-12 relative flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center w-full"
        >
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to Todo App
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-[600px] mx-auto">
            Making the same fucking app for the millionth time but with new
            framework
          </p>
        </motion.div>

        <Card className="w-full max-w-md backdrop-blur-sm bg-card/50">
          <CardHeader>
            <h2 className="text-2xl font-semibold text-center">Get Started</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button asChild variant="default" className="w-full">
                <Link href="/register">Register</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
        >
          <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        </motion.div>
      </div>
    </main>
  );
};

export default Home;
