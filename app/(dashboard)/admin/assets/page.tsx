"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  FileText,
  ImageIcon,
  Upload,
  CheckCircle2,
  Settings2,
  Link as LinkIcon,
  ExternalLink,
  XCircle,
  FileBadge,
  Eye,
  EyeOff,
  Trash2,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SiteAsset {
  key: string
  value: string
  label: string
}

export default function AssetsManagePage() {
  const [loading, setLoading] = useState(true)
  const [handbookLink, setHandbookLink] = useState("")
  
  // Admit Card Header State
  const [headerImageUrl, setHeaderImageUrl] = useState("")
  const [headerImageActive, setHeaderImageActive] = useState(true)
  const [deactivatingHeader, setDeactivatingHeader] = useState(false)
  const [removingHeader, setRemovingHeader] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Judgment Sheet Header State
  const [scoreSheetHeaderUrl, setScoreSheetHeaderUrl] = useState("")
  const [scoreSheetHeaderActive, setScoreSheetHeaderActive] = useState(true)
  const [deactivatingScoreSheet, setDeactivatingScoreSheet] = useState(false)
  const [removingScoreSheet, setRemovingScoreSheet] = useState(false)
  const [uploadingScoreSheetImage, setUploadingScoreSheetImage] = useState(false)
  const [scoreSheetUploadError, setScoreSheetUploadError] = useState<string | null>(null)

  const [updatingLink, setUpdatingLink] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const scoreSheetInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // 1. Fetch Initial Assets
  useEffect(() => {
    async function fetchAssets() {
      try {
        setLoading(true)

        const { data, error } = await (supabase.from('site_assets') as any)
          .select('*')
          .in('key', ['rulebook_link', 'admit_card_header', 'score_sheet_header'])

        if (error) throw error

        if (data) {
          const assets = data as SiteAsset[]
          const linkAsset = assets.find(a => a.key === 'rulebook_link')
          const imageAsset = assets.find(a => a.key === 'admit_card_header')
          const scoreSheetAsset = assets.find(a => a.key === 'score_sheet_header')

          if (linkAsset) setHandbookLink(linkAsset.value || "")
          
          if (imageAsset) {
            const rawVal = imageAsset.value || ""
            if (rawVal.startsWith('DISABLED:') || rawVal.startsWith('INACTIVE:')) {
              setHeaderImageUrl(rawVal.replace(/^DISABLED:|^INACTIVE:/, ''))
              setHeaderImageActive(false)
            } else {
              setHeaderImageUrl(rawVal)
              setHeaderImageActive(!!rawVal)
            }
          }

          if (scoreSheetAsset) {
            const rawVal = scoreSheetAsset.value || ""
            if (rawVal.startsWith('DISABLED:') || rawVal.startsWith('INACTIVE:')) {
              setScoreSheetHeaderUrl(rawVal.replace(/^DISABLED:|^INACTIVE:/, ''))
              setScoreSheetHeaderActive(false)
            } else {
              setScoreSheetHeaderUrl(rawVal)
              setScoreSheetHeaderActive(!!rawVal)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching assets:", error)
        toast.error("Failed to load assets")
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
  }, [])

  // 2. Update Handbook Link Handler
  const handleUpdateLink = async () => {
    if (!handbookLink.trim()) return

    try {
      setUpdatingLink(true)

      const { error } = await (supabase.from('site_assets') as any)
        .update({ value: handbookLink, updated_at: new Date().toISOString() })
        .eq('key', 'rulebook_link')

      if (error) throw error

      toast.success("Handbook link updated successfully")
    } catch (error: any) {
      console.error("Error updating link:", error)
      toast.error(error.message || "Failed to update link")
    } finally {
      setUpdatingLink(false)
    }
  }

  // 3. Image Upload Handler (Admit Card)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setUploadError(null)

    if (!file) return

    if (!file.type.startsWith('image/')) {
        const msg = "Invalid file type. Please upload an image (PNG, JPG)."
        setUploadError(msg)
        toast.error(msg)
        return
    }

    if (file.size > 2 * 1024 * 1024) {
        const msg = `File is too large (${(file.size / (1024*1024)).toFixed(2)}MB). Max size is 2MB.`
        setUploadError(msg)
        toast.error(msg)
        return
    }

    try {
        setUploadingImage(true)

        const fileExt = file.name.split('.').pop()
        const fileName = `admit-header-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('site-assets')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('site-assets')
            .getPublicUrl(filePath)

        const { error: dbError } = await (supabase.from('site_assets') as any)
            .update({ value: publicUrl, updated_at: new Date().toISOString() })
            .eq('key', 'admit_card_header')

        if (dbError) throw dbError

        setHeaderImageUrl(publicUrl)
        setHeaderImageActive(true)
        toast.success("Admit Card Header updated and activated successfully")

    } catch (error: any) {
        console.error("Upload failed:", error)
        setUploadError(error.message || "Failed to upload image")
        toast.error(error.message || "Failed to upload image")
    } finally {
        setUploadingImage(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 3B. Toggle Admit Card Header Active / Inactive
  const handleToggleHeaderActive = async () => {
    if (!headerImageUrl) return
    const nextActive = !headerImageActive
    const valueToStore = nextActive ? headerImageUrl : `DISABLED:${headerImageUrl}`

    try {
      setDeactivatingHeader(true)
      const { error } = await (supabase.from('site_assets') as any)
        .update({
          value: valueToStore,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'admit_card_header')

      if (error) throw error

      setHeaderImageActive(nextActive)
      if (nextActive) {
        toast.success("Admit Card Header activated")
      } else {
        toast.warning("Admit Card Header deactivated. 'PMSA ARTS FEST 2026-27' banner will be used.")
      }
    } catch (error: any) {
      console.error("Error toggling header status:", error)
      toast.error(error.message || "Failed to update status")
    } finally {
      setDeactivatingHeader(false)
    }
  }

  // 3C. Remove Admit Card Header Image
  const handleRemoveHeaderImage = async () => {
    if (!confirm("Are you sure you want to remove the Admit Card header banner?")) return
    try {
      setRemovingHeader(true)
      const { error } = await (supabase.from('site_assets') as any)
        .update({
          value: '',
          updated_at: new Date().toISOString()
        })
        .eq('key', 'admit_card_header')

      if (error) throw error

      setHeaderImageUrl('')
      setHeaderImageActive(false)
      toast.success("Admit Card banner removed. Default 'PMSA ARTS FEST 2026-27' header will be printed.")
    } catch (error: any) {
      console.error("Error removing header:", error)
      toast.error(error.message || "Failed to remove banner")
    } finally {
      setRemovingHeader(false)
    }
  }

  // 4. Score Sheet Header Handler (Judgment Sheet)
  const handleScoreSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setScoreSheetUploadError(null)

    if (!file) return

    if (!file.type.startsWith('image/')) {
        const msg = "Invalid file type. Please upload an image (PNG, JPG)."
        setScoreSheetUploadError(msg)
        toast.error(msg)
        return
    }

    if (file.size > 2 * 1024 * 1024) {
        const msg = `File is too large (${(file.size / (1024*1024)).toFixed(2)}MB). Max size is 2MB.`
        setScoreSheetUploadError(msg)
        toast.error(msg)
        return
    }

    try {
        setUploadingScoreSheetImage(true)

        const fileExt = file.name.split('.').pop()
        const fileName = `score-sheet-header-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('site-assets')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('site-assets')
            .getPublicUrl(filePath)

        const { error: dbError } = await (supabase.from('site_assets') as any)
            .update({ value: publicUrl, updated_at: new Date().toISOString() })
            .eq('key', 'score_sheet_header')

        if (dbError) throw dbError

        setScoreSheetHeaderUrl(publicUrl)
        setScoreSheetHeaderActive(true)
        toast.success("Judgment Sheet Header updated and activated successfully")

    } catch (error: any) {
        console.error("Upload failed:", error)
        setScoreSheetUploadError(error.message || "Failed to upload image")
        toast.error(error.message || "Failed to upload image")
    } finally {
        setUploadingScoreSheetImage(false)
        if (scoreSheetInputRef.current) scoreSheetInputRef.current.value = ''
    }
  }

  // 4B. Toggle Score Sheet Header Active / Inactive
  const handleToggleScoreSheetActive = async () => {
    if (!scoreSheetHeaderUrl) return
    const nextActive = !scoreSheetHeaderActive
    const valueToStore = nextActive ? scoreSheetHeaderUrl : `DISABLED:${scoreSheetHeaderUrl}`

    try {
      setDeactivatingScoreSheet(true)
      const { error } = await (supabase.from('site_assets') as any)
        .update({
          value: valueToStore,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'score_sheet_header')

      if (error) throw error

      setScoreSheetHeaderActive(nextActive)
      if (nextActive) {
        toast.success("Judgment Sheet Header activated")
      } else {
        toast.warning("Judgment Sheet Header deactivated. 'PMSA ARTS FEST 2026-27' banner will be used.")
      }
    } catch (error: any) {
      console.error("Error toggling score sheet header status:", error)
      toast.error(error.message || "Failed to update status")
    } finally {
      setDeactivatingScoreSheet(false)
    }
  }

  // 4C. Remove Score Sheet Header Image
  const handleRemoveScoreSheetImage = async () => {
    if (!confirm("Are you sure you want to remove the Judgment Sheet header banner?")) return
    try {
      setRemovingScoreSheet(true)
      const { error } = await (supabase.from('site_assets') as any)
        .update({
          value: '',
          updated_at: new Date().toISOString()
        })
        .eq('key', 'score_sheet_header')

      if (error) throw error

      setScoreSheetHeaderUrl('')
      setScoreSheetHeaderActive(false)
      toast.success("Judgment Sheet banner removed. Default 'PMSA ARTS FEST 2026-27' header will be printed.")
    } catch (error: any) {
      console.error("Error removing score sheet header:", error)
      toast.error(error.message || "Failed to remove banner")
    } finally {
      setRemovingScoreSheet(false)
    }
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Loading assets settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" />
            <span>Site Assets & Settings</span>
        </h1>
        <p className="text-sm text-slate-500">
            Manage public downloadable links, certificate headers, judgment sheets, and admit card graphics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* --- CARD 1: RULEBOOK / HANDBOOK LINK --- */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden bg-white flex flex-col">
            <CardHeader className="bg-linear-to-r from-blue-50 to-white border-b border-blue-100/50 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600 shadow-sm ring-1 ring-blue-200">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">Fest Rulebook Link</CardTitle>
                        <CardDescription className="text-slate-500 mt-1">
                            Link displayed to Captains & Users to download handbook PDF.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-8 flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-2">
                    <Label htmlFor="handbook-url" className="text-slate-700 font-medium flex items-center justify-between">
                        <span>Drive / PDF Download URL</span>
                        {handbookLink && (
                            <a
                                href={handbookLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-normal"
                            >
                                Test Link <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </Label>
                    <div className="relative">
                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            id="handbook-url"
                            placeholder="https://drive.google.com/file/d/..."
                            value={handbookLink}
                            onChange={(e) => setHandbookLink(e.target.value)}
                            className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                    </div>
                </div>

                <div className="mt-auto pt-4 flex justify-end">
                    <Button
                        onClick={handleUpdateLink}
                        disabled={updatingLink || !handbookLink.trim()}
                        className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all flex items-center gap-2"
                    >
                        {updatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Save Link
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* --- CARD 2: ADMIT CARD HEADER --- */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden bg-white flex flex-col">
            <CardHeader className="bg-linear-to-r from-purple-50 to-white border-b border-purple-100/50 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 rounded-lg text-purple-600 shadow-sm ring-1 ring-purple-200">
                        <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">Admit Card Header</CardTitle>
                        <CardDescription className="text-slate-500 mt-1">
                            Banner displayed on student Admit Cards.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-8 flex-1 flex flex-col gap-6">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Label className="text-slate-700 font-medium">Header Status</Label>
                            {headerImageUrl ? (
                                headerImageActive ? (
                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> ACTIVE BANNER
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] font-semibold gap-1">
                                        <EyeOff className="w-3 h-3" /> DEACTIVATED
                                    </Badge>
                                )
                            ) : (
                                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 text-[11px] font-semibold gap-1">
                                    <Sparkles className="w-3 h-3" /> DEFAULT TEXT ACTIVE
                                </Badge>
                            )}
                        </div>

                        {/* Toggle & Remove Buttons */}
                        {headerImageUrl && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deactivatingHeader}
                                    onClick={handleToggleHeaderActive}
                                    className={cn(
                                        "h-8 text-xs font-semibold gap-1.5 transition-colors",
                                        headerImageActive
                                            ? "border-amber-200 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                                            : "border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                                    )}
                                >
                                    {deactivatingHeader ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : headerImageActive ? (
                                        <>
                                            <EyeOff className="w-3.5 h-3.5" /> Deactivate
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-3.5 h-3.5" /> Activate
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={removingHeader}
                                    onClick={handleRemoveHeaderImage}
                                    className="h-8 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1"
                                >
                                    {removingHeader ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    Remove
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="relative rounded-xl border border-slate-200 bg-slate-100/50 p-2 min-h-40 flex items-center justify-center overflow-hidden group hover:border-purple-200 transition-colors">
                        {uploadingImage && (
                            <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in">
                                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                                <span className="text-sm font-medium text-slate-600">Uploading banner...</span>
                            </div>
                        )}

                        {headerImageUrl ? (
                            <div className="relative w-full h-full flex flex-col items-center justify-center">
                                <img
                                    src={headerImageUrl}
                                    alt="Admit Card Header"
                                    className={cn(
                                        "w-full h-auto max-h-[180px] object-contain rounded-lg shadow-sm transition-all duration-300",
                                        !headerImageActive && "opacity-30 grayscale filter blur-[0.5px]"
                                    )}
                                />
                                {!headerImageActive && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xs rounded-lg p-3 text-center text-white">
                                        <EyeOff className="w-6 h-6 text-amber-400 mb-1" />
                                        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Header Deactivated</p>
                                        <p className="text-[11px] text-slate-200 mt-0.5">
                                            Admit cards will print: <strong className="text-amber-300">PMSA ARTS FEST 2026-27</strong>
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center py-6 px-4">
                                <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 mb-2">
                                    <Sparkles className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm font-bold text-slate-800">PMSA ARTS FEST 2026-27</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                                    Default text header active. Upload a custom banner image below if desired.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-800">Upload Failed</p>
                            <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                        </div>
                    </div>
                )}

                <div className="mt-auto">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        className="w-full h-11 border-dashed border-2 border-slate-300 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-slate-600 hover:text-purple-700 transition-all group"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-xs sm:text-sm">
                                {headerImageUrl ? "Upload / Replace banner" : "Upload custom banner (2000x350px)"}
                            </span>
                        </div>
                      </Button>
                </div>
            </CardContent>
        </Card>

        {/* --- CARD 3: JUDGMENT SHEET HEADER --- */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden bg-white flex flex-col md:col-span-2 lg:col-span-1">
            <CardHeader className="bg-linear-to-r from-orange-50 to-white border-b border-orange-100/50 pb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-100 rounded-lg text-orange-600 shadow-sm ring-1 ring-orange-200">
                        <FileBadge className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">Judgment Sheet Header</CardTitle>
                        <CardDescription className="text-slate-500 mt-1">
                            Logo/Banner for Judgment & Score Sheets used by judges.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-8 flex-1 flex flex-col gap-6">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Label className="text-slate-700 font-medium">Header Status</Label>
                            {scoreSheetHeaderUrl ? (
                                scoreSheetHeaderActive ? (
                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> ACTIVE BANNER
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] font-semibold gap-1">
                                        <EyeOff className="w-3 h-3" /> DEACTIVATED
                                    </Badge>
                                )
                            ) : (
                                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 text-[11px] font-semibold gap-1">
                                    <Sparkles className="w-3 h-3" /> DEFAULT TEXT ACTIVE
                                </Badge>
                            )}
                        </div>

                        {/* Toggle & Remove Buttons */}
                        {scoreSheetHeaderUrl && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deactivatingScoreSheet}
                                    onClick={handleToggleScoreSheetActive}
                                    className={cn(
                                        "h-8 text-xs font-semibold gap-1.5 transition-colors",
                                        scoreSheetHeaderActive
                                            ? "border-amber-200 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                                            : "border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                                    )}
                                >
                                    {deactivatingScoreSheet ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : scoreSheetHeaderActive ? (
                                        <>
                                            <EyeOff className="w-3.5 h-3.5" /> Deactivate
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-3.5 h-3.5" /> Activate
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={removingScoreSheet}
                                    onClick={handleRemoveScoreSheetImage}
                                    className="h-8 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1"
                                >
                                    {removingScoreSheet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    Remove
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="relative rounded-xl border border-slate-200 bg-slate-100/50 p-2 min-h-40 flex items-center justify-center overflow-hidden group hover:border-orange-200 transition-colors">
                        {uploadingScoreSheetImage && (
                            <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in">
                                <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
                                <span className="text-sm font-medium text-slate-600">Uploading...</span>
                            </div>
                        )}
                        {scoreSheetHeaderUrl ? (
                            <div className="relative w-full h-full flex flex-col items-center justify-center">
                                <img
                                    src={scoreSheetHeaderUrl}
                                    alt="Score Sheet Header"
                                    className={cn(
                                        "w-full h-auto max-h-[180px] object-contain rounded-lg shadow-sm transition-all duration-300",
                                        !scoreSheetHeaderActive && "opacity-30 grayscale filter blur-[0.5px]"
                                    )}
                                />
                                {!scoreSheetHeaderActive && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xs rounded-lg p-3 text-center text-white">
                                        <EyeOff className="w-6 h-6 text-amber-400 mb-1" />
                                        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Header Deactivated</p>
                                        <p className="text-[11px] text-slate-200 mt-0.5">
                                            Score sheets will print: <strong className="text-amber-300">PMSA ARTS FEST 2026-27</strong>
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center py-6 px-4">
                                <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 mb-2">
                                    <Sparkles className="w-6 h-6 text-orange-600" />
                                </div>
                                <p className="text-sm font-bold text-slate-800">PMSA ARTS FEST 2026-27</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                                    Default text header active. Upload a custom judgment banner image below if desired.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {scoreSheetUploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-800">Upload Failed</p>
                            <p className="text-xs text-red-600 mt-1">{scoreSheetUploadError}</p>
                        </div>
                    </div>
                )}

                <div className="mt-auto">
                      <input
                        type="file"
                        accept="image/*"
                        ref={scoreSheetInputRef}
                        onChange={handleScoreSheetUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        className="w-full h-11 border-dashed border-2 border-slate-300 bg-slate-50 hover:bg-orange-50 hover:border-orange-300 text-slate-600 hover:text-orange-700 transition-all group"
                        onClick={() => scoreSheetInputRef.current?.click()}
                        disabled={uploadingScoreSheetImage}
                      >
                        <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-xs sm:text-sm">
                                {scoreSheetHeaderUrl ? "Upload / Replace header" : "Upload custom header (1500x300px)"}
                            </span>
                        </div>
                      </Button>
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  )
}