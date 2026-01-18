"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Upload,
  Link as LinkIcon,
  Save,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  FileText,
  Settings2,
  XCircle,
  FileBadge // New icon for Score Sheet
} from "lucide-react"
import { toast } from "sonner"

interface SiteAsset {
  key: string
  value: string
  label: string
}

export default function AssetsManagePage() {
  const [loading, setLoading] = useState(true)
  const [handbookLink, setHandbookLink] = useState("")
  const [headerImageUrl, setHeaderImageUrl] = useState("")
  const [scoreSheetHeaderUrl, setScoreSheetHeaderUrl] = useState("")

  const [updatingLink, setUpdatingLink] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingScoreSheetImage, setUploadingScoreSheetImage] = useState(false)

  // Error states
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [scoreSheetUploadError, setScoreSheetUploadError] = useState<string | null>(null)

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

          if (linkAsset) setHandbookLink(linkAsset.value)
          if (imageAsset) setHeaderImageUrl(imageAsset.value)
          if (scoreSheetAsset) setScoreSheetHeaderUrl(scoreSheetAsset.value)
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
    } catch (error) {
      console.error("Error updating link:", error)
      toast.error("Failed to update link")
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
        toast.success("Admit Card Header updated successfully")

    } catch (error: any) {
        console.error("Upload failed:", error)
        setUploadError(error.message || "Failed to upload image")
        toast.error("Failed to upload image")
    } finally {
        setUploadingImage(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
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
        toast.success("Judgment Sheet Header updated successfully")

    } catch (error: any) {
        console.error("Upload failed:", error)
        setScoreSheetUploadError(error.message || "Failed to upload image")
        toast.error("Failed to upload image")
    } finally {
        setUploadingScoreSheetImage(false)
        if (scoreSheetInputRef.current) scoreSheetInputRef.current.value = ''
    }
  }

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 space-y-8 animate-in fade-in duration-500">

      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-6">
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
          <Settings2 className="w-8 h-8 text-slate-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assets Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure global resources for portals and generated documents.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 max-w-6xl mx-auto">

        {/* --- CARD 1: HANDBOOK CONFIGURATION --- */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden bg-white">
            <CardHeader className="bg-linear-to-r from-blue-50 to-white border-b border-blue-100/50 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600 shadow-sm ring-1 ring-blue-200">
                        <LinkIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">Event Handbook</CardTitle>
                        <CardDescription className="text-slate-500 mt-1">
                            Set the Google Drive or PDF link for the Captain's rulebook.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
                <div className="space-y-3">
                    <Label htmlFor="handbook-url" className="text-slate-700 font-medium">External Drive Link</Label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FileText className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <Input
                            id="handbook-url"
                            placeholder="https://drive.google.com/..."
                            value={handbookLink}
                            onChange={(e) => setHandbookLink(e.target.value)}
                            className="pl-10 font-mono text-sm bg-slate-50 focus:bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100 h-11 transition-all"
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span>Must be a publicly accessible URL.</span>
                        {handbookLink && (
                            <a
                                href={handbookLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer"
                            >
                                Test Link <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-slate-100 py-4 px-6 flex justify-end">
                <Button
                    onClick={handleUpdateLink}
                    disabled={updatingLink || !handbookLink}
                    className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                >
                    {updatingLink ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                        <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                    )}
                </Button>
            </CardFooter>
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
                {/* Visual Preview Container */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-slate-700 font-medium">Current Banner</Label>
                        <Badge variant="outline" className="text-xs font-normal text-slate-500 bg-slate-50">
                            Rec: 2000x350px
                        </Badge>
                    </div>

                    <div className="relative rounded-xl border border-slate-200 bg-slate-100/50 p-2 min-h-40 flex items-center justify-center overflow-hidden group hover:border-purple-200 transition-colors">
                        {uploadingImage && (
                            <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in">
                                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                                <span className="text-sm font-medium text-slate-600">Uploading...</span>
                            </div>
                        )}
                        {headerImageUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img
                                    src={headerImageUrl}
                                    alt="Current Header"
                                    className="w-full h-auto max-h-[180px] object-contain rounded-lg shadow-sm"
                                />
                                <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" /> ACTIVE
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400 py-8">
                                <ImageIcon className="w-8 h-8 opacity-40 mb-3" />
                                <p className="text-sm font-medium">No image set</p>
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
                        className="w-full h-12 border-dashed border-2 border-slate-300 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-slate-600 hover:text-purple-700 transition-all group"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        <div className="flex flex-col items-center py-1">
                            <div className="flex items-center gap-2">
                                <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold">Upload new banner</span>
                            </div>
                        </div>
                      </Button>
                </div>
            </CardContent>
        </Card>

        {/* --- CARD 3: SCORE SHEET HEADER --- */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden bg-white flex flex-col">
            <CardHeader className="bg-linear-to-r from-orange-50 to-white border-b border-orange-100/50 pb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-100 rounded-lg text-orange-600 shadow-sm ring-1 ring-orange-200">
                        <FileBadge className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">Judgment Sheet Header</CardTitle>
                        <CardDescription className="text-slate-500 mt-1">
                            Logo/Banner for Score Sheets used by judges.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-8 flex-1 flex flex-col gap-6">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-slate-700 font-medium">Current Header</Label>
                        <Badge variant="outline" className="text-xs font-normal text-slate-500 bg-slate-50">
                            Rec: 1500x300px
                        </Badge>
                    </div>

                    <div className="relative rounded-xl border border-slate-200 bg-slate-100/50 p-2 min-h-40 flex items-center justify-center overflow-hidden group hover:border-orange-200 transition-colors">
                        {uploadingScoreSheetImage && (
                            <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in">
                                <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
                                <span className="text-sm font-medium text-slate-600">Uploading...</span>
                            </div>
                        )}
                        {scoreSheetHeaderUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-[url('/grid-pattern.svg')]">
                                <img
                                    src={scoreSheetHeaderUrl}
                                    alt="Score Sheet Header"
                                    className="w-full h-auto max-h-[180px] object-contain rounded-lg shadow-sm"
                                />
                                <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" /> ACTIVE
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400 py-8">
                                <ImageIcon className="w-8 h-8 opacity-40 mb-3" />
                                <p className="text-sm font-medium">No image set</p>
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
                        className="w-full h-12 border-dashed border-2 border-slate-300 bg-slate-50 hover:bg-orange-50 hover:border-orange-300 text-slate-600 hover:text-orange-700 transition-all group"
                        onClick={() => scoreSheetInputRef.current?.click()}
                        disabled={uploadingScoreSheetImage}
                      >
                        <div className="flex flex-col items-center py-1">
                            <div className="flex items-center gap-2">
                                <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold">Upload new header</span>
                            </div>
                        </div>
                      </Button>
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  )
}