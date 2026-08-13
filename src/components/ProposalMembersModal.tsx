import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, UserPlus, Users, Shield, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProposalMembersModalProps = {
  proposalId: string;
  proposalTitle: string;
  trigger?: React.ReactNode;
};

type ProfileOption = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
};

type MemberRow = {
  id: string;
  proposal_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: ProfileOption | null;
};

export function ProposalMembersModal({ proposalId, proposalTitle, trigger }: ProposalMembersModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"editor" | "viewer">("editor");
  const [searchUser, setSearchUser] = useState("");
  const queryClient = useQueryClient();

  // Fetch current members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["proposal-members", proposalId],
    enabled: open,
    queryFn: async () => {
      const res = await api.proposals.members.list(proposalId);
      return (res as unknown as MemberRow[]) ?? [];
    },
  });

  // Fetch available users for invite
  const { data: availableUsers = [] } = useQuery({
    queryKey: ["all-users-simple", searchUser],
    enabled: open,
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, full_name, email, avatar_url").is("deleted_at", null).limit(20);
      if (searchUser.trim()) {
        query = query.or(`full_name.ilike.%${searchUser.trim()}%,email.ilike.%${searchUser.trim()}%`);
      }
      const { data } = await query;
      return (data as ProfileOption[]) ?? [];
    },
  });

  // Invite Member Mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("Pilih pengguna terlebih dahulu");
      await api.proposals.members.invite(proposalId, selectedUserId, selectedRole);
    },
    onSuccess: () => {
      toast.success("Anggota tim berhasil ditambahkan ke proposal.");
      setSelectedUserId("");
      void queryClient.invalidateQueries({ queryKey: ["proposal-members", proposalId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menambahkan anggota tim.");
    },
  });

  // Remove Member Mutation
  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.proposals.members.remove(proposalId, userId);
    },
    onSuccess: () => {
      toast.success("Akses anggota berhasil dihapus.");
      void queryClient.invalidateQueries({ queryKey: ["proposal-members", proposalId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menghapus anggota.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Users className="size-3.5 text-primary" /> Kelola Tim & Kolaborasi
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-primary" /> Kolaborasi Tim Proposal
          </DialogTitle>
          <DialogDescription className="text-xs">
            Undang rekan tim untuk membaca atau mengedit proposal &quot;{proposalTitle}&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invite Section */}
          <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
            <span className="text-xs font-semibold block text-foreground">Undang Anggota Baru</span>
            <div className="space-y-2">
              <Label className="text-[11px]">Cari & Pilih Pengguna</Label>
              <Input
                placeholder="Cari nama atau email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="h-8 text-xs mb-1.5"
              />
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="-- Pilih Pengguna --" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.full_name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-1/2 space-y-1">
                <Label className="text-[11px]">Peran Akses</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "editor" | "viewer")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor" className="text-xs">Editor (Dapat Mengubah)</SelectItem>
                    <SelectItem value="viewer" className="text-xs">Viewer (Hanya Melihat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-1/2 pt-5">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5"
                  disabled={!selectedUserId || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate()}
                >
                  {inviteMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                  Tambah Anggota
                </Button>
              </div>
            </div>
          </div>

          {/* Members List Section */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Daftar Kolaborator Aktif ({members.length})
            </span>
            {isLoadingMembers ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin inline mr-1" /> Memuat anggota tim...
              </div>
            ) : members.length === 0 ? (
              <div className="p-4 rounded-md border border-dashed text-center text-xs text-muted-foreground">
                Belum ada anggota tim tambahan di proposal ini.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-md border text-xs bg-card">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(m.profiles?.full_name ?? "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-none">{m.profiles?.full_name || "Pengguna"}</p>
                        <p className="text-[10px] text-muted-foreground">{m.profiles?.email || m.user_id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={m.role === "editor" ? "default" : "secondary"} className="text-[10px] gap-1">
                        {m.role === "editor" ? <Shield className="size-2.5" /> : <Eye className="size-2.5" />}
                        {m.role === "editor" ? "Editor" : "Viewer"}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(m.user_id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
