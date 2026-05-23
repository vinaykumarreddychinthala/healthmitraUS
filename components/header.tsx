"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, X, User, LogOut, Settings, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        // Get user profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (profile?.full_name) {
          setUserName(profile.full_name)
        } else if (user.email) {
          setUserName(user.email.split('@')[0])
        }
      }
    }
    getUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <nav className="flex items-center justify-between px-4 py-3.5 md:px-6 max-w-7xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl md:text-2xl text-primary hover:opacity-90 transition-opacity"
        >
          <img src="/logo.jpg" alt="HealthMitra" className="h-14 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          <Link href="/">
            <Button variant="ghost" className="text-sm text-foreground hover:text-primary">
              Home
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost" className="text-sm text-foreground hover:text-primary">
              About
            </Button>
          </Link>
          <Link href="/services">
            <Button variant="ghost" className="text-sm text-foreground hover:text-primary">
              Services
            </Button>
          </Link>
          <Link href="/plans">
            <Button variant="ghost" className="text-sm text-foreground hover:text-primary">
              Plans
            </Button>
          </Link>
          <Link href="/blog">
            <Button variant="ghost" className="text-sm text-foreground hover:text-primary">
              Blog
            </Button>
          </Link>
          <Link href="/faq">
            <Button variant="ghost" className="text-sm text-foreground hover:text-primary">
              FAQ
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="ghost" className="text-sm text-foreground hover:text-primary">
              Contact
            </Button>
          </Link>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">{userName}</span>
                  <ChevronDown className="h-4 w-4 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-foreground">
                  Sign In
                </Button>
              </Link>
              <Link href="/plans">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">View Plans</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-foreground hover:bg-muted rounded-lg"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card">
          <div className="flex flex-col p-4 gap-2 max-w-7xl mx-auto w-full">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start text-foreground">
                Home
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost" className="w-full justify-start text-foreground">
                About
              </Button>
            </Link>
            <Link href="/services">
              <Button variant="ghost" className="w-full justify-start text-foreground">
                Services
              </Button>
            </Link>
            <Link href="/plans">
              <Button variant="ghost" className="w-full justify-start text-foreground">
                Plans
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" className="w-full justify-start text-foreground">
                Blog
              </Button>
            </Link>
            <Link href="/faq">
              <Button variant="ghost" className="w-full justify-start text-foreground">
                FAQ
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" className="w-full justify-start text-foreground">
                Contact
              </Button>
            </Link>
            <div className="border-t border-border pt-4 mt-2 flex flex-col gap-2">
              {user ? (
                <>
                  <Link href="/dashboard" className="w-full">
                    <Button variant="outline" className="w-full">Dashboard</Button>
                  </Link>
                  <Link href="/profile" className="w-full">
                    <Button variant="outline" className="w-full">Profile</Button>
                  </Link>
                  <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="w-full">
                    <Button variant="outline" className="w-full bg-transparent">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/plans" className="w-full">
                    <Button className="w-full bg-primary hover:bg-primary/90">View Plans</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
