import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, UserPlus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Team {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    username: string;
    email: string;
  };
}

interface TeamManagementProps {
  user: User;
}

export const TeamManagement = ({ user }: TeamManagementProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    loadTeams();
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    // Load teams where user is owner
    const { data: ownedTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id);

    // Load teams where user is a member
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('user_id', user.id);

    const allTeams = [
      ...(ownedTeams || []),
      ...(memberTeams?.map(m => m.teams).filter(Boolean) || [])
    ];

    setTeams(allTeams as Team[]);
  };

  const loadTeamMembers = async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);

    if (error) {
      console.error('Error loading team members:', error);
      return;
    }

    // Fetch profiles separately
    const enrichedMembers = await Promise.all(
      (data || []).map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('id', member.user_id)
          .single();

        return {
          ...member,
          profiles: profile
        };
      })
    );

    setTeamMembers(enrichedMembers);
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a team name",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase.from('teams').insert({
      name: newTeamName,
      description: newTeamDescription,
      owner_id: user.id
    });

    if (error) {
      toast({
        title: "Error creating team",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Team created",
      description: "Your team has been created successfully"
    });

    setNewTeamName("");
    setNewTeamDescription("");
    setIsCreateDialogOpen(false);
    loadTeams();
  };

  const inviteMember = async () => {
    if (!selectedTeam || !inviteEmail.trim()) {
      toast({
        title: "Invalid input",
        description: "Please select a team and enter an email",
        variant: "destructive"
      });
      return;
    }

    // First, find the user by email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail)
      .single();

    if (!profiles) {
      toast({
        title: "User not found",
        description: "No user found with this email",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase.from('team_members').insert({
      team_id: selectedTeam,
      user_id: profiles.id,
      role: 'member'
    });

    if (error) {
      toast({
        title: "Error inviting member",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Member invited",
      description: "Team member has been added successfully"
    });

    setInviteEmail("");
    setIsInviteDialogOpen(false);
    loadTeamMembers(selectedTeam);
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Member removed",
      description: "Team member has been removed"
    });

    if (selectedTeam) {
      loadTeamMembers(selectedTeam);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Collaboration</h2>
          <p className="text-muted-foreground">Manage your teams and collaborate on prompts</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a team to collaborate with others on prompts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Team Name</Label>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="My Team"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="What's this team for?"
                  rows={3}
                />
              </div>
              <Button onClick={createTeam} className="w-full">
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Teams List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teams yet</p>
              ) : (
                teams.map((team) => (
                  <Button
                    key={team.id}
                    variant={selectedTeam === team.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTeam(team.id)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {team.name}
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Details */}
        {selectedTeam && (
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Members</CardTitle>
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Invite someone to join your team by their email
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Email Address</Label>
                        <Input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="user@example.com"
                        />
                      </div>
                      <Button onClick={inviteMember} className="w-full">
                        Send Invite
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet</p>
                ) : (
                  teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">
                          {member.profiles?.username || member.profiles?.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profiles?.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{member.role}</Badge>
                        {member.user_id !== user.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
