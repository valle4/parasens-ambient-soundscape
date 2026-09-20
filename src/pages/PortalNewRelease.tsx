import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, FileAudio, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import PortalSignOut from "@/components/portal/PortalSignOut";

type ReleaseType = "Single" | "EP" | "Album";
type FormStep = 1 | 2 | 3;
type AudioDelivery = "" | "stems" | "stereo" | "both";
type StereoMixStatus = "" | "rough" | "mixed" | "mastered";

type TrackDraft = {
  id: number;
  title: string;
  composers: string;
  notes: string;
  audioDelivery: AudioDelivery;
  stereoStatus: StereoMixStatus;
  stereoFiles: string[];
  stemFiles: string[];
};

const emptyTrack = (id: number): TrackDraft => ({
  id,
  title: "",
  composers: "",
  notes: "",
  audioDelivery: "",
  stereoStatus: "",
  stereoFiles: [],
  stemFiles: [],
});

const fieldClassName =
  "mt-3 w-full border-0 border-b border-border bg-transparent px-0 py-3 text-sm text-foreground outline-none transition-colors duration-500 placeholder:text-muted-foreground/35 focus:border-foreground";

const labelClassName = "block text-[9px] uppercase tracking-[0.24em] text-muted-foreground";

const formSteps: Array<{ id: FormStep; label: string }> = [
  { id: 1, label: "Release information" },
  { id: 2, label: "Artwork" },
  { id: 3, label: "Tracks" },
];

const audioDeliveryOptions: Array<{ id: Exclude<AudioDelivery, "">; label: string }> = [
  { id: "stems", label: "Audio stems only" },
  { id: "stereo", label: "Stereo mix only" },
  { id: "both", label: "Stereo mix and stems" },
];

const stereoStatusOptions: Array<{ id: Exclude<StereoMixStatus, "">; label: string }> = [
  { id: "rough", label: "Rough / reference mix" },
  { id: "mixed", label: "Mixed — not mastered" },
  { id: "mastered", label: "Mixed and mastered" },
];

// TODO: Replace this prototype list with the artist names assigned to the signed-in account.
const accountArtists: Array<{ id: string; name: string }> = [];

const PortalNewRelease = () => {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [furthestStep, setFurthestStep] = useState<FormStep>(1);
  const [releaseType, setReleaseType] = useState<ReleaseType>("Single");
  const [artistSelection, setArtistSelection] = useState("");
  const [primaryArtist, setPrimaryArtist] = useState("");
  const [releaseTitle, setReleaseTitle] = useState("");
  const [parasensChoosesTitle, setParasensChoosesTitle] = useState(false);
  const [wantsArtworkMaterial, setWantsArtworkMaterial] = useState(false);
  const [artworkName, setArtworkName] = useState("");
  const [tracks, setTracks] = useState<TrackDraft[]>([emptyTrack(1)]);
  const [nextTrackId, setNextTrackId] = useState(2);
  const [notice, setNotice] = useState("");

  const updateTrack = (id: number, field: "title" | "composers" | "notes", value: string) => {
    setTracks((current) =>
      current.map((track) => (track.id === id ? { ...track, [field]: value } : track)),
    );
  };

  const updateTrackDelivery = (id: number, audioDelivery: AudioDelivery) => {
    setTracks((current) =>
      current.map((track) => (track.id === id ? { ...track, audioDelivery } : track)),
    );
  };

  const updateStereoStatus = (id: number, stereoStatus: StereoMixStatus) => {
    setTracks((current) =>
      current.map((track) => (track.id === id ? { ...track, stereoStatus } : track)),
    );
  };

  const updateTrackFiles = (
    id: number,
    field: "stereoFiles" | "stemFiles",
    files: FileList | null,
  ) => {
    setTracks((current) =>
      current.map((track) =>
        track.id === id
          ? { ...track, [field]: files ? Array.from(files).map((file) => file.name) : [] }
          : track,
      ),
    );
  };

  const addTrack = () => {
    setTracks((current) => [...current, emptyTrack(nextTrackId)]);
    setNextTrackId((current) => current + 1);
  };

  const removeTrack = (id: number) => {
    setTracks((current) => current.filter((track) => track.id !== id));
  };

  const saveDraft = () => {
    setNotice("Draft saving will be connected when we build the database.");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (currentStep < 3) {
      const nextStep = (currentStep + 1) as FormStep;
      setCurrentStep(nextStep);
      setFurthestStep((current) => (current < nextStep ? nextStep : current));
      setNotice("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setNotice("The review step will be connected next. Nothing has been submitted.");
  };

  const goToStep = (step: FormStep) => {
    if (step > furthestStep) return;
    setCurrentStep(step);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    if (currentStep === 1) return;
    goToStep((currentStep - 1) as FormStep);
  };

  const continueLabel =
    currentStep === 1
      ? "Continue to artwork"
      : currentStep === 2
        ? "Continue to tracks"
        : "Continue to review";

  const isCustomArtist = artistSelection === "custom";
  const parasensChoosesArtist = artistSelection === "parasens";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-6 text-foreground md:px-12 md:py-8 lg:px-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,hsl(var(--foreground)/0.035),transparent_34%)]" />

      <header className="relative z-10 flex items-center justify-between border-b border-border pb-6 opacity-0 animate-fade-in">
        <Link
          to="/"
          aria-label="Return to the Parasens website"
          className="font-display text-base font-semibold tracking-[0.18em] transition-opacity duration-500 hover:opacity-60 md:text-lg"
        >
          PARASENS
        </Link>

        <div className="flex items-center gap-5 md:gap-8">
          <span className="hidden text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:inline">
            Artist portal
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <PortalSignOut />
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 mx-auto w-full max-w-6xl pb-24 pt-12 opacity-0 animate-fade-up animation-delay-200 md:pt-16"
      >
        <Link
          to="/portal/dashboard"
          className="group inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors duration-500 hover:text-foreground"
        >
          <ArrowLeft
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-translate-x-1"
            strokeWidth={1.5}
          />
          Catalogue
        </Link>

        <div className="mt-12 max-w-2xl md:mt-16">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">New release</p>
          <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.025em] md:text-6xl">
            Tell us about the music.
          </h1>
          <p className="mt-5 max-w-lg text-sm font-light leading-6 text-muted-foreground">
            Start a draft now. You can review everything before it is submitted to PARASENS.
          </p>
        </div>

        <nav aria-label="Release form progress" className="mt-14 border-y border-border md:mt-20">
          <ol className="grid grid-cols-3">
            {formSteps.map((step) => {
              const isCurrent = currentStep === step.id;
              const isAvailable = step.id <= furthestStep;
              const isComplete = step.id < furthestStep;

              return (
                <li key={step.id} className="border-r border-border last:border-r-0">
                  <button
                    type="button"
                    disabled={!isAvailable}
                    aria-current={isCurrent ? "step" : undefined}
                    onClick={() => goToStep(step.id)}
                    className={`relative flex min-h-20 w-full flex-col justify-center px-3 py-4 text-left transition-colors duration-500 sm:px-5 md:min-h-24 md:px-7 ${
                      isCurrent
                        ? "bg-foreground/[0.035] text-foreground"
                        : isAvailable
                          ? "text-muted-foreground hover:text-foreground"
                          : "cursor-not-allowed text-muted-foreground/35"
                    }`}
                  >
                    <span className="text-[9px] tracking-[0.22em]">0{step.id}</span>
                    <span className="mt-2 hidden text-[9px] uppercase tracking-[0.16em] sm:block md:text-[10px]">
                      {step.label}
                    </span>
                    <span className="mt-2 text-[8px] uppercase tracking-[0.14em] text-muted-foreground sm:hidden">
                      {step.id === 1 ? "Release" : step.label}
                    </span>
                    {isComplete && (
                      <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-foreground md:right-5 md:top-5" />
                    )}
                    <span
                      className={`absolute bottom-0 left-0 h-px bg-foreground transition-all duration-500 ${
                        isCurrent ? "w-full opacity-100" : "w-0 opacity-0"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section
          className={`${currentStep === 1 ? "block animate-fade-up" : "hidden"} mt-16 md:mt-20`}
        >
          <div className="grid gap-10 lg:grid-cols-[0.34fr_1fr] lg:gap-20">
            <div>
              <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">01</p>
              <h2 className="mt-4 font-display text-2xl tracking-[-0.02em]">Release information</h2>
              <p className="mt-4 max-w-xs text-xs font-light leading-5 text-muted-foreground">
                The information that applies to the release as a whole.
              </p>
            </div>

            <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
              <div>
                <label htmlFor="primary-artist-selection" className={labelClassName}>
                  Primary artist
                </label>
                <div className="relative">
                  <select
                    id="primary-artist-selection"
                    name="primaryArtistSelection"
                    required={currentStep === 1}
                    value={artistSelection}
                    onChange={(event) => setArtistSelection(event.target.value)}
                    className={`${fieldClassName} appearance-none pr-10 text-muted-foreground focus:text-foreground`}
                  >
                    <option value="" disabled>
                      Choose an artist
                    </option>
                    {accountArtists.map((artist) => (
                      <option key={artist.id} value={artist.id}>
                        {artist.name}
                      </option>
                    ))}
                    <option value="custom">Enter another artist name</option>
                    <option value="parasens">Ask PARASENS to decide</option>
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/4 text-muted-foreground"
                    strokeWidth={1.25}
                  />
                </div>

                {isCustomArtist && (
                  <div className="mt-6 animate-fade-up">
                    <label htmlFor="primary-artist-custom" className={labelClassName}>
                      Enter artist name
                    </label>
                    <input
                      id="primary-artist-custom"
                      name="primaryArtist"
                      required={currentStep === 1}
                      value={primaryArtist}
                      onChange={(event) => setPrimaryArtist(event.target.value)}
                      placeholder="Artist name"
                      className={fieldClassName}
                    />
                  </div>
                )}

                {parasensChoosesArtist && (
                  <p className="mt-4 text-xs font-light leading-5 text-muted-foreground">
                    PARASENS will propose the artist name before the release is submitted.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="release-title" className={labelClassName}>
                    Release title
                  </label>
                  <button
                    type="button"
                    aria-pressed={parasensChoosesTitle}
                    onClick={() => setParasensChoosesTitle((current) => !current)}
                    className={`shrink-0 border-b pb-1 text-[8px] uppercase tracking-[0.16em] transition-colors duration-300 ${
                      parasensChoosesTitle
                        ? "border-foreground text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {parasensChoosesTitle ? "PARASENS will decide" : "Ask PARASENS to decide"}
                  </button>
                </div>
                <input
                  id="release-title"
                  name="releaseTitle"
                  required={currentStep === 1 && !parasensChoosesTitle}
                  disabled={parasensChoosesTitle}
                  value={parasensChoosesTitle ? "" : releaseTitle}
                  onChange={(event) => setReleaseTitle(event.target.value)}
                  placeholder={parasensChoosesTitle ? "PARASENS will propose the release title" : "Title of the release"}
                  className={`${fieldClassName} disabled:cursor-not-allowed disabled:text-muted-foreground`}
                />
                <input
                  type="hidden"
                  name="releaseTitleDecision"
                  value={parasensChoosesTitle ? "parasens" : "artist"}
                />
              </div>

              <label className={labelClassName}>
                Label
                <input
                  name="label"
                  required={currentStep === 1}
                  placeholder="Which label is this release for?"
                  className={`${fieldClassName} placeholder:text-muted-foreground/70`}
                />
              </label>

              <fieldset>
                <legend className={labelClassName}>Release type</legend>
                <div className="mt-3 grid grid-cols-3 border border-border">
                  {(["Single", "EP", "Album"] as ReleaseType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={releaseType === type}
                      onClick={() => setReleaseType(type)}
                      className={`border-r border-border px-3 py-3 text-[10px] uppercase tracking-[0.16em] transition-colors duration-300 last:border-r-0 ${
                        releaseType === type
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="releaseType" value={releaseType} />
              </fieldset>

              <label className={labelClassName}>
                Genre
                <input
                  name="genre"
                  required={currentStep === 1}
                  placeholder="e.g. Ambient"
                  className={fieldClassName}
                />
              </label>

              <label className={labelClassName}>
                Playlist / Brief
                <input
                  name="playlistBrief"
                  placeholder="Optional playlist or brief"
                  className={fieldClassName}
                />
              </label>

              <label className={`md:col-span-2 ${labelClassName}`}>
                General notes
                <textarea
                  name="generalNotes"
                  rows={4}
                  placeholder="Anything else you would like us to know about the release"
                  className={`${fieldClassName} resize-none leading-6`}
                />
              </label>
            </div>
          </div>
        </section>

        <section
          className={`${currentStep === 2 ? "block animate-fade-up" : "hidden"} mt-16 md:mt-20`}
        >
          <div className="grid gap-10 lg:grid-cols-[0.34fr_1fr] lg:gap-20">
            <div>
              <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">02</p>
              <h2 className="mt-4 font-display text-2xl tracking-[-0.02em]">Artwork</h2>
              <p className="mt-4 max-w-xs text-xs font-light leading-5 text-muted-foreground">
                You do not need to provide artwork.
              </p>
            </div>

            <div>
              <label className="group flex cursor-pointer items-start gap-5 border border-border p-5 transition-colors duration-500 hover:border-foreground/50 md:p-7">
                <input
                  type="checkbox"
                  name="provideArtworkMaterial"
                  checked={wantsArtworkMaterial}
                  onChange={(event) => {
                    setWantsArtworkMaterial(event.target.checked);
                    if (!event.target.checked) setArtworkName("");
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors duration-300 ${
                    wantsArtworkMaterial
                      ? "border-foreground bg-foreground text-background"
                      : "border-muted-foreground/60 group-hover:border-foreground"
                  }`}
                >
                  {wantsArtworkMaterial && <Check className="h-3 w-3" strokeWidth={2} />}
                </span>
                <span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-foreground">
                    I want to submit artwork or visual references
                  </span>
                  <span className="mt-2 block text-xs font-light leading-5 text-muted-foreground">
                    If you already have artwork or visual ideas, you can share them here.
                  </span>
                </span>
              </label>

              {wantsArtworkMaterial && (
                <div className="mt-8 grid animate-fade-up gap-10 md:grid-cols-2">
                  <label className="group flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-border px-6 py-8 text-center transition-colors duration-500 hover:border-foreground/60">
                    <ImagePlus
                      aria-hidden="true"
                      className="h-5 w-5 text-muted-foreground"
                      strokeWidth={1.25}
                    />
                    <span className="mt-4 text-[10px] uppercase tracking-[0.2em]">
                      {artworkName || "Choose artwork or references"}
                    </span>
                    <span className="mt-2 text-[10px] text-muted-foreground">JPG, PNG or PDF</span>
                    <input
                      type="file"
                      name="artwork"
                      accept="image/jpeg,image/png,application/pdf"
                      className="sr-only"
                      onChange={(event) => setArtworkName(event.target.files?.[0]?.name || "")}
                    />
                  </label>

                  <label className={labelClassName}>
                    Artwork inspiration
                    <textarea
                      name="artworkInspiration"
                      rows={6}
                      placeholder="Describe the visual direction or paste reference links"
                      className={`${fieldClassName} resize-none leading-6`}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          className={`${currentStep === 3 ? "block animate-fade-up" : "hidden"} mt-16 md:mt-20`}
        >
          <div className="grid gap-10 lg:grid-cols-[0.34fr_1fr] lg:gap-20">
            <div>
              <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">03</p>
              <h2 className="mt-4 font-display text-2xl tracking-[-0.02em]">Tracks</h2>
              <p className="mt-4 max-w-xs text-xs font-light leading-5 text-muted-foreground">
                Add the track information and choose which audio files you are providing.
              </p>
            </div>

            <div>
              <div className="space-y-6">
                {tracks.map((track, index) => {
                  const requiresStereo =
                    track.audioDelivery === "stereo" || track.audioDelivery === "both";
                  const requiresStems =
                    track.audioDelivery === "stems" || track.audioDelivery === "both";

                  return (
                  <fieldset key={track.id} className="border border-border p-5 md:p-8">
                    <legend className="sr-only">Track {index + 1}</legend>
                    <div className="flex items-center justify-between border-b border-border pb-5">
                      <span className="text-[10px] uppercase tracking-[0.24em]">Track {index + 1}</span>
                      {tracks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTrack(track.id)}
                          className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
                        >
                          Remove
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.25} />
                        </button>
                      )}
                    </div>

                    <div className="mt-7 grid gap-x-10 gap-y-9 md:grid-cols-2">
                      <label className={labelClassName}>
                        Track title
                        <input
                          name={`track-${track.id}-title`}
                          required={currentStep === 3}
                          value={track.title}
                          onChange={(event) => updateTrack(track.id, "title", event.target.value)}
                          placeholder="Title"
                          className={fieldClassName}
                        />
                      </label>

                      <label className={labelClassName}>
                        Songwriters / composers
                        <input
                          name={`track-${track.id}-composers`}
                          required={currentStep === 3}
                          value={track.composers}
                          onChange={(event) => updateTrack(track.id, "composers", event.target.value)}
                          placeholder="Full legal names"
                          className={fieldClassName}
                        />
                      </label>

                      <fieldset className="md:col-span-2">
                        <legend className={labelClassName}>What files are you providing?</legend>
                        <div className="mt-3 grid border border-border md:grid-cols-3">
                          {audioDeliveryOptions.map((option) => (
                            <label
                              key={option.id}
                              className={`cursor-pointer border-b border-border px-4 py-4 text-[9px] uppercase tracking-[0.16em] transition-colors duration-300 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 ${
                                track.audioDelivery === option.id
                                  ? "bg-foreground text-background"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`track-${track.id}-audio-delivery`}
                                value={option.id}
                                checked={track.audioDelivery === option.id}
                                required={currentStep === 3}
                                onChange={() => updateTrackDelivery(track.id, option.id)}
                                className="sr-only"
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                        <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
                          At least one audio format is required. If you provide stems, a stereo mix is optional.
                        </p>
                      </fieldset>

                      <div className="grid gap-5 md:col-span-2 md:grid-cols-2">
                        <label className="group flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-border px-5 py-7 text-center transition-colors duration-500 hover:border-foreground/60">
                          <span className="absolute sr-only">
                            Stereo mix {requiresStereo ? "required" : "optional"}
                          </span>
                          {track.stereoFiles.length > 0 ? (
                            <FileAudio
                              aria-hidden="true"
                              className="h-5 w-5 text-foreground"
                              strokeWidth={1.25}
                            />
                          ) : (
                            <Upload
                              aria-hidden="true"
                              className="h-5 w-5 text-muted-foreground"
                              strokeWidth={1.25}
                            />
                          )}
                          <span className="mt-4 text-[10px] uppercase tracking-[0.2em]">
                            {track.stereoFiles.length > 0 ? track.stereoFiles[0] : "Choose stereo mix"}
                          </span>
                          <span className="mt-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                            {track.audioDelivery ? (requiresStereo ? "Required" : "Optional") : "Select above"}
                          </span>
                          <span className="mt-2 text-[10px] text-muted-foreground">WAV, AIFF or FLAC</span>
                          <input
                            type="file"
                            name={`track-${track.id}-stereo`}
                            accept="audio/*,.wav,.aiff,.aif,.flac"
                            required={currentStep === 3 && requiresStereo}
                            className="sr-only"
                            onChange={(event) =>
                              updateTrackFiles(track.id, "stereoFiles", event.target.files)
                            }
                          />
                        </label>

                        <label className="group flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-border px-5 py-7 text-center transition-colors duration-500 hover:border-foreground/60">
                          <span className="absolute sr-only">
                            Audio stems {requiresStems ? "required" : "optional"}
                          </span>
                          {track.stemFiles.length > 0 ? (
                            <FileAudio
                              aria-hidden="true"
                              className="h-5 w-5 text-foreground"
                              strokeWidth={1.25}
                            />
                          ) : (
                            <Upload
                              aria-hidden="true"
                              className="h-5 w-5 text-muted-foreground"
                              strokeWidth={1.25}
                            />
                          )}
                          <span className="mt-4 text-[10px] uppercase tracking-[0.2em]">
                            {track.stemFiles.length > 0
                              ? `${track.stemFiles.length} stem file${track.stemFiles.length === 1 ? "" : "s"} selected`
                              : "Choose audio stems"}
                          </span>
                          <span className="mt-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                            {track.audioDelivery ? (requiresStems ? "Required" : "Optional") : "Select above"}
                          </span>
                          <span className="mt-2 max-w-xs text-[10px] leading-4 text-muted-foreground">
                            Select multiple files or one ZIP archive
                          </span>
                          <input
                            type="file"
                            name={`track-${track.id}-stems`}
                            accept="audio/*,.wav,.aiff,.aif,.flac,.zip"
                            multiple
                            required={currentStep === 3 && requiresStems}
                            className="sr-only"
                            onChange={(event) =>
                              updateTrackFiles(track.id, "stemFiles", event.target.files)
                            }
                          />
                        </label>
                      </div>

                      {requiresStereo && (
                        <fieldset className="animate-fade-up md:col-span-2">
                          <legend className={labelClassName}>Stereo mix status</legend>
                          <div className="mt-3 grid border border-border md:grid-cols-3">
                            {stereoStatusOptions.map((option) => (
                              <label
                                key={option.id}
                                className={`cursor-pointer border-b border-border px-4 py-4 text-[9px] uppercase tracking-[0.16em] transition-colors duration-300 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 ${
                                  track.stereoStatus === option.id
                                    ? "bg-foreground text-background"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`track-${track.id}-stereo-status`}
                                  value={option.id}
                                  checked={track.stereoStatus === option.id}
                                  required={currentStep === 3}
                                  onChange={() => updateStereoStatus(track.id, option.id)}
                                  className="sr-only"
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      )}

                      <label className={`md:col-span-2 ${labelClassName}`}>
                        Track-specific notes
                        <textarea
                          name={`track-${track.id}-notes`}
                          rows={3}
                          value={track.notes}
                          onChange={(event) => updateTrack(track.id, "notes", event.target.value)}
                          placeholder="Mix notes, featured artists, versions, or anything specific to this track"
                          className={`${fieldClassName} resize-none leading-6`}
                        />
                      </label>
                    </div>
                  </fieldset>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addTrack}
                className="group mt-6 flex w-full items-center justify-center gap-3 border border-border px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-500 hover:border-foreground/60 hover:text-foreground"
              >
                <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={1.25} />
                Add another track
              </button>
            </div>
          </div>
        </section>

        <div className="mt-16 border-t border-border pt-8 md:mt-20 md:flex md:items-center md:justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Step {currentStep} of 3
            </p>
            <div aria-live="polite" className="mt-2 min-h-5 text-xs text-muted-foreground">
              {notice || "Prototype form — nothing is uploaded or saved yet."}
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row md:mt-0">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="group inline-flex items-center justify-center gap-3 px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-500 hover:text-foreground"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-500 group-hover:-translate-x-1"
                  strokeWidth={1.5}
                />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={saveDraft}
              className="px-7 py-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-500 hover:text-foreground"
            >
              Save draft
            </button>
            <button
              type="submit"
              className="group inline-flex items-center justify-between gap-12 border border-foreground px-7 py-4 text-[10px] uppercase tracking-[0.2em] transition-all duration-500 hover:bg-foreground hover:text-background"
            >
              {continueLabel}
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1"
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>
      </form>
    </main>
  );
};

export default PortalNewRelease;
