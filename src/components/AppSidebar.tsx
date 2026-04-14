import { LayoutDashboard, Users, FileText, Target, LogOut, Settings, Shield, Stethoscope, Compass, RotateCcw } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const journeyNavItems = [
  { title: 'Meu Progresso', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Testes', url: '/tests', icon: Compass },
  { title: 'Plano de Ação', url: '/acompanhamento', icon: Target },
  { title: 'Relatórios', url: '/central-report', icon: FileText },
  { title: 'Histórico', url: '/history', icon: RotateCcw },
];

const professionalNavItems = [
  { title: 'Meu Progresso', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Pessoas', url: '/pessoas', icon: Users },
  { title: 'Testes', url: '/tests', icon: Compass },
  { title: 'Plano de Ação', url: '/acompanhamento', icon: Target },
  { title: 'Relatórios', url: '/central-report', icon: FileText },
  { title: 'Histórico', url: '/history', icon: RotateCcw },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();
  const { isSuperAdmin, planType, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0">
          <span className="text-sidebar-primary text-xs font-semibold">RX</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-primary tracking-tight">
            Raio-X
          </span>
        )}
      </div>

      <SidebarContent className="px-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[0.6rem] uppercase tracking-[0.15em] text-sidebar-foreground/40 font-semibold px-3 mb-1">Jornada</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {(planType === 'profissional' || isSuperAdmin ? professionalNavItems : journeyNavItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 text-sm"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(planType === 'profissional' || isSuperAdmin) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/painel-profissional"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 text-sm"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Stethoscope className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span>Profissional</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/dashboard"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 text-sm"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Shield className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 text-sm"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              >
                <Settings className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>Configurações</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 text-sm w-full"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>Sair</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
