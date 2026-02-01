import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Megaphone,
  Plus,
  AlertCircle,
  Calendar,
  Building2,
  Trash2,
  Edit,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  building_id: string;
  is_urgent: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  buildings?: {
    name: string;
  };
}

interface Building {
  id: string;
  name: string;
}

export default function Announcements() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = hasRole('admin');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    building_id: '',
    is_urgent: false,
    expires_at: '',
  });

  useEffect(() => {
    fetchAnnouncements();
    fetchBuildings();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          buildings(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      building_id: '',
      is_urgent: false,
      expires_at: '',
    });
    setEditingAnnouncement(null);
  };

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        building_id: announcement.building_id,
        is_urgent: announcement.is_urgent || false,
        expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content || !formData.building_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        building_id: formData.building_id,
        is_urgent: formData.is_urgent,
        expires_at: formData.expires_at || null,
        published_at: new Date().toISOString(),
        created_by: user?.id,
      };

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Announcement updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(payload);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Announcement created successfully',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to save announcement',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Announcement deleted successfully',
      });
      setDeleteId(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <AppLayout
      title="Announcements"
      description="Building news and important notices"
    >
      <div className="space-y-6">
        {/* Admin: Create Button */}
        {isAdmin && (
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAnnouncement
                      ? 'Update the announcement details below.'
                      : 'Add a new announcement for building residents.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="building">Building *</Label>
                    <Select
                      value={formData.building_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, building_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g., New gardener starting from May 2026"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      placeholder="Provide details about the announcement..."
                      rows={4}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expires_at">Expiration Date (optional)</Label>
                    <Input
                      id="expires_at"
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) =>
                        setFormData({ ...formData, expires_at: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_urgent"
                      checked={formData.is_urgent}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_urgent: checked })
                      }
                    />
                    <Label htmlFor="is_urgent">Mark as urgent</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingAnnouncement ? 'Update' : 'Publish'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Announcements List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-lg">No announcements yet</p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Announcement
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {announcements.map((announcement) => (
              <Card
                key={announcement.id}
                className={`transition-all ${
                  announcement.is_urgent
                    ? 'border-destructive/50 bg-destructive/5'
                    : ''
                } ${isExpired(announcement.expires_at) ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-full p-2 ${
                          announcement.is_urgent
                            ? 'bg-destructive/10'
                            : 'bg-primary/10'
                        }`}
                      >
                        {announcement.is_urgent ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Megaphone className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{announcement.title}</CardTitle>
                          {announcement.is_urgent && (
                            <Badge variant="destructive">Urgent</Badge>
                          )}
                          {isExpired(announcement.expires_at) && (
                            <Badge variant="secondary">Expired</Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Building2 className="h-3 w-3" />
                          {announcement.buildings?.name || 'Unknown Building'}
                        </CardDescription>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Published:{' '}
                      {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                    </span>
                    {announcement.expires_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires:{' '}
                        {format(new Date(announcement.expires_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
