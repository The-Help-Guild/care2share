import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, MapPin, Megaphone, Plus, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { MentionTextarea } from "@/components/MentionTextarea";
import { MentionText } from "@/components/MentionText";

interface Event {
  id: string;
  type: "event" | "announcement";
  title: string;
  description: string;
  event_date: string | null;
  location: string | null;
  created_at: string;
}

interface Poll {
  id: string;
  event_id: string;
  question: string;
  options: PollOption[];
  userVote?: string;
}

interface PollOption {
  id: string;
  option_text: string;
  votes: number;
}

export default function Events() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [events, setEvents] = useState<Event[]>([]);
  const [polls, setPolls] = useState<Record<string, Poll>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    type: "event" as "event" | "announcement",
    title: "",
    description: "",
    event_date: "",
    location: "",
    poll_question: "",
    poll_options: ["", ""]
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents((data as Event[]) || []);

      // Fetch polls for all events
      if (data) {
        for (const event of data) {
          await fetchPollForEvent(event.id);
        }
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const fetchPollForEvent = async (eventId: string) => {
    try {
      const { data: pollData, error: pollError } = await supabase
        .from("event_polls")
        .select("id, question")
        .eq("event_id", eventId)
        .maybeSingle();

      if (pollError) throw pollError;
      if (!pollData) return;

      const { data: optionsData, error: optionsError } = await supabase
        .from("poll_options")
        .select("id, option_text")
        .eq("poll_id", pollData.id);

      if (optionsError) throw optionsError;

      const { data: votesData, error: votesError } = await supabase
        .from("poll_votes")
        .select("option_id, user_id")
        .eq("poll_id", pollData.id);

      if (votesError) throw votesError;

      const { data: { user } } = await supabase.auth.getUser();
      const userVote = votesData?.find(v => v.user_id === user?.id)?.option_id;

      const optionsWithVotes: PollOption[] = (optionsData || []).map(opt => ({
        ...opt,
        votes: votesData?.filter(v => v.option_id === opt.id).length || 0
      }));

      setPolls(prev => ({
        ...prev,
        [eventId]: {
          id: pollData.id,
          event_id: eventId,
          question: pollData.question,
          options: optionsWithVotes,
          userVote
        }
      }));
    } catch (error) {
      console.error("Error fetching poll:", error);
    }
  };

  const handleCreateEvent = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const eventData: any = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        created_by: userData.user.id
      };

      if (formData.type === "event") {
        eventData.event_date = formData.event_date || null;
        eventData.location = formData.location || null;
      }

      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert(eventData)
        .select()
        .single();

      if (eventError) throw eventError;

      // Create poll if provided
      if (formData.poll_question && formData.poll_options.filter(o => o.trim()).length >= 2) {
        const { data: pollData, error: pollError } = await supabase
          .from("event_polls")
          .insert({
            event_id: newEvent.id,
            question: formData.poll_question
          })
          .select()
          .single();

        if (pollError) throw pollError;

        const pollOptions = formData.poll_options
          .filter(opt => opt.trim())
          .map(opt => ({
            poll_id: pollData.id,
            option_text: opt
          }));

        const { error: optionsError } = await supabase
          .from("poll_options")
          .insert(pollOptions);

        if (optionsError) throw optionsError;
      }

      toast.success(`${formData.type === "event" ? "Event" : "Announcement"} created successfully!`);
      setDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    }
  };

  const handleEditEvent = async () => {
    if (!editingEvent) return;

    try {
      const eventData: any = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
      };

      if (formData.type === "event") {
        eventData.event_date = formData.event_date || null;
        eventData.location = formData.location || null;
      }

      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", editingEvent.id);

      if (error) throw error;

      toast.success(`${formData.type === "event" ? "Event" : "Announcement"} updated successfully!`);
      setEditDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Event deleted successfully");
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      type: event.type as "event" | "announcement",
      title: event.title,
      description: event.description,
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
      location: event.location || "",
      poll_question: "",
      poll_options: ["", ""]
    });
    setEditDialogOpen(true);
  };

  const handleVote = async (pollId: string, optionId: string, eventId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please log in to vote");
        return;
      }

      const currentVote = polls[eventId]?.userVote;

      if (currentVote) {
        await supabase
          .from("poll_votes")
          .delete()
          .eq("poll_id", pollId)
          .eq("user_id", userData.user.id);
      }

      if (currentVote !== optionId) {
        const { error } = await supabase
          .from("poll_votes")
          .insert({
            poll_id: pollId,
            option_id: optionId,
            user_id: userData.user.id
          });

        if (error) throw error;
      }

      await fetchPollForEvent(eventId);
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to vote");
    }
  };

  const resetForm = () => {
    setFormData({
      type: "event",
      title: "",
      description: "",
      event_date: "",
      location: "",
      poll_question: "",
      poll_options: ["", ""]
    });
  };

  const addPollOption = () => {
    setFormData(prev => ({
      ...prev,
      poll_options: [...prev.poll_options, ""]
    }));
  };

  const removePollOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      poll_options: prev.poll_options.filter((_, i) => i !== index)
    }));
  };

  const updatePollOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      poll_options: prev.poll_options.map((opt, i) => i === index ? value : opt)
    }));
  };

  if (loading || adminLoading) {
    return <div className="container py-8">Loading...</div>;
  }

  const totalVotes = (poll: Poll) => poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Events & Announcements</h1>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-muted-foreground mt-1">Stay updated with community events and news</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Event or Announcement</DialogTitle>
                <DialogDescription>Share upcoming events or important announcements with the community</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value: "event" | "announcement") => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Event title" />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <MentionTextarea 
                    value={formData.description} 
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value }))} 
                    placeholder="Event details (use @ to mention users)" 
                    rows={4} 
                  />
                </div>

                {formData.type === "event" && (
                  <>
                    <div className="space-y-2">
                      <Label>Date & Time</Label>
                      <Input type="datetime-local" value={formData.event_date} onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))} />
                    </div>

                    <div className="space-y-2">
                      <Label>Location (optional)</Label>
                      <Input value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="Event location" />
                    </div>
                  </>
                )}

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Add Poll (Optional)</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Poll Question</Label>
                      <Input value={formData.poll_question} onChange={(e) => setFormData(prev => ({ ...prev, poll_question: e.target.value }))} placeholder="What would you like to ask?" />
                    </div>

                    <div className="space-y-2">
                      <Label>Poll Options</Label>
                      {formData.poll_options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input value={option} onChange={(e) => updatePollOption(index, e.target.value)} placeholder={`Option ${index + 1}`} />
                          {formData.poll_options.length > 2 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePollOption(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addPollOption}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                </div>

                <Button onClick={handleCreateEvent} className="w-full" disabled={!formData.title || !formData.description}>
                  Create {formData.type === "event" ? "Event" : "Announcement"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        {isAdmin && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit {formData.type === "event" ? "Event" : "Announcement"}</DialogTitle>
                <DialogDescription>Update the event or announcement details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value: "event" | "announcement") => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Event title" />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <MentionTextarea 
                    value={formData.description} 
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value }))} 
                    placeholder="Event details (use @ to mention users)" 
                    rows={4} 
                  />
                </div>

                {formData.type === "event" && (
                  <>
                    <div className="space-y-2">
                      <Label>Date & Time</Label>
                      <Input type="datetime-local" value={formData.event_date} onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))} />
                    </div>

                    <div className="space-y-2">
                      <Label>Location (optional)</Label>
                      <Input value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="Event location" />
                    </div>
                  </>
                )}

                <Button onClick={handleEditEvent} className="w-full" disabled={!formData.title || !formData.description}>
                  Update {formData.type === "event" ? "Event" : "Announcement"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-6">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No events or announcements yet
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${event.type === "event" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground"}`}>
                    {event.type === "event" ? <Calendar className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {event.type === "event" && event.event_date && (
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(event.event_date), "PPp")}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(event);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this event?")) {
                            handleDeleteEvent(event.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <MentionText text={event.description} className="text-sm whitespace-pre-wrap" />

                {polls[event.id] && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">{polls[event.id].question}</h4>
                    <div className="space-y-2">
                      {polls[event.id].options.map((option) => {
                        const total = totalVotes(polls[event.id]);
                        const percentage = total > 0 ? (option.votes / total) * 100 : 0;
                        const isSelected = polls[event.id].userVote === option.id;

                        return (
                          <button
                            key={option.id}
                            onClick={() => handleVote(polls[event.id].id, option.id, event.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors relative overflow-hidden ${
                              isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="absolute inset-0 bg-primary/10" style={{ width: `${percentage}%` }} />
                            <div className="relative flex items-center justify-between">
                              <span className="font-medium">{option.option_text}</span>
                              <span className="text-sm text-muted-foreground">
                                {option.votes} vote{option.votes !== 1 ? "s" : ""} ({percentage.toFixed(0)}%)
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      <p className="text-xs text-muted-foreground mt-2">
                        Total votes: {totalVotes(polls[event.id])}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
      <BottomNav />
    </div>
  );
}
