"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, Link as LinkIcon, Save, Image as ImageIcon, ExternalLink, CheckCircle2 } from "lucide-react"
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

  const [updatingLink, setUpdatingLink] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // 1. Fetch Initial Assets
  useEffect(() => {
    async function fetchAssets() {
      try {
        setLoading(true)

        // FIX: Cast the entire query builder chain to 'any'
        // This bypasses the table check completely
        const { data, error } = await (supabase.from('site_assets') as any)
          .select('*')
          .in('key', ['rulebook_link', 'admit_card_header'])

        if (error) throw error

        if (data) {
          const assets = data as SiteAsset[]
          const linkAsset = assets.find(a => a.key === 'rulebook_link')
          const imageAsset = assets.find(a => a.key === 'admit_card_header')

          if (linkAsset) setHandbookLink(linkAsset.value)
          if (imageAsset) setHeaderImageUrl(imageAsset.value)
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

      // FIX: Cast the query builder to 'any' before calling .update()
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

  // 3. Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Basic Validation
    if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file")
        return
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error("Image size must be less than 2MB")
        return
    }

    try {
        setUploadingImage(true)

        // A. Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `admit-header-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('site-assets')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        // B. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('site-assets')
            .getPublicUrl(filePath)

        // C. Update Database Record
        // FIX: Cast the query builder to 'any' before calling .update()
        const { error: dbError } = await (supabase.from('site_assets') as any)
            .update({ value: publicUrl, updated_at: new Date().toISOString() })
            .eq('key', 'admit_card_header')

        if (dbError) throw dbError

        // D. Update Local State
        setHeaderImageUrl(publicUrl)
        toast.success("Header image uploaded successfully")

    } catch (error) {
        console.error("Upload failed:", error)
        toast.error("Failed to upload image")
    } finally {
        setUploadingImage(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8">

      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assets Management</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Manage dynamic resources for the event portal. Updates made here reflect immediately on the student and captain dashboards.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 max-w-5xl">

        {/* --- CARD 1: HANDBOOK LINK --- */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <LinkIcon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg">Event Handbook</CardTitle>
                </div>
                <CardDescription>
                    The Google Drive or PDF link accessed by Captains.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="handbook-url">Drive Link URL</Label>
                    <div className="flex gap-2">
                        <Input
                            id="handbook-url"
                            placeholder="https://drive.google.com/file/d/..."
                            value={handbookLink}
                            onChange={(e) => setHandbookLink(e.target.value)}
                            className="font-mono text-sm bg-slate-50 focus:bg-white transition-colors"
                        />
                        {handbookLink && (
                             <Button
                                variant="outline"
                                size="icon"
                                type="button"
                                onClick={() => window.open(handbookLink, '_blank')}
                                title="Test Link"
                             >
                                <ExternalLink className="w-4 h-4" />
                             </Button>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end py-3">
                <Button
                    onClick={handleUpdateLink}
                    disabled={updatingLink || !handbookLink}
                    className="w-full md:w-auto"
                >
                    {updatingLink ? (
                        <>
                           <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...
                        </>
                    ) : (
                        <>
                           <Save className="w-4 h-4 mr-2" /> Save Changes
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>

        {/* --- CARD 2: ADMIT CARD HEADER --- */}
        <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-white border-b border-slate-100 pb-4">
                 <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <ImageIcon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg">Admit Card Header</CardTitle>
                </div>
                <CardDescription>
                    This image appears at the top of every generated PDF admit card.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col gap-6">

                {/* Image Preview Area */}
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 flex flex-col items-center justify-center min-h-40 relative overflow-hidden group">
                    {uploadingImage && (
                        <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                <span className="text-sm font-medium text-purple-600">Uploading...</span>
                            </div>
                        </div>
                    )}

                    {headerImageUrl ? (
                        <div className="relative w-full">
                            <img
                                src={headerImageUrl}
                                alt="Current Header"
                                className="w-full h-auto max-h-[200px] object-contain rounded-md shadow-sm"
                            />
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Active
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400">
                            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No image set</p>
                        </div>
                    )}
                </div>

                {/* Upload Controls */}
                <div className="space-y-2">
                     <Label>Upload New Header</Label>
                     <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        id="header-upload"
                     />
                     <Button
                        variant="outline"
                        className="w-full h-12 border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50 text-slate-600 hover:text-purple-700 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                     >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingImage ? "Uploading..." : "Click to Select Image"}
                     </Button>
                     <p className="text-xs text-slate-400 text-center">
                        Recommended: PNG or JPG, max 2MB.
                        <br/>Aspect ratio should be wide (e.g. 1000x200px).
                     </p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}