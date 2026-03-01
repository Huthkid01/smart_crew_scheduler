import React from 'react';
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Calendar, CheckCircle2, Clock, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-black to-black opacity-50" />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              <span>AI-Powered Scheduling is Here</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
              Build Smart Schedules <br />
              <span className="text-primary">That Actually Work</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Automate your workforce management with AI. Create conflict-free schedules, track time, and optimize labor costs in seconds.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-black font-bold h-12 px-8 text-lg">
                  Start for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-12 px-8 text-lg border-white/20 bg-transparent hover:bg-white/10 text-white hover:text-white focus:text-white"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-zinc-950" id="features">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to manage your team</h2>
            <p className="text-gray-400">Streamline operations with our comprehensive suite of tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Bot className="h-8 w-8 text-primary" />}
              title="AI Scheduling"
              description="Generate optimized schedules in one click based on availability, skills, and labor laws."
            />
            <FeatureCard 
              icon={<Calendar className="h-8 w-8 text-primary" />}
              title="Smart Calendar"
              description="Interactive drag-and-drop calendar with real-time conflict detection and updates."
            />
            <FeatureCard 
              icon={<Users className="h-8 w-8 text-primary" />}
              title="Team Management"
              description="Centralized employee profiles, skill tracking, and performance monitoring."
            />
            <FeatureCard 
              icon={<Clock className="h-8 w-8 text-primary" />}
              title="Time Tracking"
              description="Seamless clock-in/out and timesheet management for accurate payroll."
            />
            <FeatureCard 
              icon={<Zap className="h-8 w-8 text-primary" />}
              title="Instant Notifications"
              description="Keep everyone in the loop with automated SMS and email alerts for shift changes."
            />
            <FeatureCard 
              icon={<CheckCircle2 className="h-8 w-8 text-primary" />}
              title="Labor Compliance"
              description="Automatically flag overtime and break violations before they happen."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-black" id="pricing">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400">Choose the plan that fits your team's needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* Starter Plan */}
             <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                <div className="text-4xl font-bold text-white mb-4">$0<span className="text-lg text-gray-400 font-normal">/mo</span></div>
                <p className="text-gray-400 mb-6">Perfect for small teams getting started.</p>
                <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Up to 5 employees</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Basic scheduling</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> 1 week history</li>
                </ul>
                <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">Get Started</Button>
             </div>
             
             {/* Pro Plan */}
             <div className="p-8 rounded-2xl bg-zinc-900 border-2 border-primary relative flex flex-col transform md:-translate-y-4">
                <div className="absolute top-0 right-0 bg-primary text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
                <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
                <div className="text-4xl font-bold text-white mb-4">$29<span className="text-lg text-gray-400 font-normal">/mo</span></div>
                <p className="text-gray-400 mb-6">For growing businesses needing automation.</p>
                <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Up to 50 employees</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> AI Auto-scheduling</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Time tracking</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Advanced reporting</li>
                </ul>
                <Button className="w-full bg-primary hover:bg-primary/90 text-black font-bold">Try Pro Free</Button>
             </div>

             {/* Enterprise Plan */}
             <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-white mb-4">Custom</div>
                <p className="text-gray-400 mb-6">For large organizations with complex needs.</p>
                <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Unlimited employees</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Custom integrations</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Dedicated support</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> SLA & Security</li>
                </ul>
                <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">Contact Sales</Button>
             </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-zinc-950" id="about">
        <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">About SmartCrew</h2>
                    <p className="text-gray-400 mb-6 leading-relaxed">
                        SmartCrew was born from a simple idea: scheduling shouldn't be a headache. We believe that technology should empower managers to focus on their people, not spreadsheets.
                    </p>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Our mission is to revolutionize workforce management through intelligent automation, making it easier for businesses to optimize their operations while improving work-life balance for employees.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <div className="text-3xl font-bold text-primary mb-2">10k+</div>
                            <div className="text-sm text-gray-500">Active Users</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-primary mb-2">99%</div>
                            <div className="text-sm text-gray-500">Customer Satisfaction</div>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl transform rotate-3"></div>
                    <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 relative z-10">
                        <h3 className="text-xl font-bold mb-4">Our Values</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start">
                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-3 mt-1 text-sm">1</div>
                                <div>
                                    <h4 className="font-bold text-white">Innovation First</h4>
                                    <p className="text-sm text-gray-400">Constantly pushing the boundaries of what's possible with AI.</p>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-3 mt-1 text-sm">2</div>
                                <div>
                                    <h4 className="font-bold text-white">User-Centric</h4>
                                    <p className="text-sm text-gray-400">Designed for real people, solving real problems.</p>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-3 mt-1 text-sm">3</div>
                                <div>
                                    <h4 className="font-bold text-white">Reliability</h4>
                                    <p className="text-sm text-gray-400">Systems you can trust to run your business 24/7.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/10">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to transform your scheduling?</h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses saving time and money with SmartCrew Scheduler.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-black font-bold h-14 px-10 text-xl">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black border-t border-white/10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white">SmartCrew Scheduler</span>
          </div>
          <div className="text-gray-500 text-sm">
            © 2026 SmartCrew Scheduler. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}
