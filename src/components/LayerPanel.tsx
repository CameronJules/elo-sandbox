import { useRef } from 'react'
import { ChevronDown, Plus, Eye, Bot, Camera, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEditorStore, type LayerKey } from '@/lib/viewmodels/useEditorStore'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { configSerializer } from '@/lib/config/configSerializer'
import { logger } from '@/lib/observability/logger'
import { saveRiveFile, bufferToBlobUrl } from '@/lib/services/riveFileStorage'
import { riveControllerRef } from '@/lib/viewmodels/riveController'

const LAYERS: { key: LayerKey; label: string; Icon: React.ElementType }[] = [
  { key: 'rive', label: 'Rive animation', Icon: Eye },
  { key: 'llm', label: 'LLM provider', Icon: Bot },
  { key: 'face', label: 'Face tracker', Icon: Camera },
  { key: 'chop', label: 'CHOP', Icon: SlidersHorizontal },
]

export function LayerPanel() {
  const { selectedLayer, setSelectedLayer, rive, clearRive, resetRive } = useEditorStore()
  const riveInputRef = useRef<HTMLInputElement>(null)
  const configInputRef = useRef<HTMLInputElement>(null)

  async function handleRiveFile(file: File) {
    if (!file.name.endsWith('.riv')) return
    const buffer = await file.arrayBuffer()
    await saveRiveFile(buffer, file.name)
    riveControllerRef.current = null
    resetRive(bufferToBlobUrl(buffer), file.name)
  }

  function handleConfigFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        configSerializer.loadFromJSON(ev.target?.result as string)
        logger.log('system', 'Config loaded from file')
      } catch {
        logger.error('system', 'Failed to parse config file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <svg
          viewBox="0 0 180 108"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-auto dark:invert shrink-0"
          aria-label="ELO"
        >
          <path d="M130.254 42.4221C129.369 42.4221 128.667 42.6759 128.169 43.1785C127.269 44.0873 127.279 45.5342 127.289 46.4937C127.299 47.4228 127.284 48.4077 127.269 49.3926C127.249 50.8395 127.223 52.3422 127.279 53.6673C127.33 54.8502 127.432 57.3074 130.249 57.3074C133.066 57.3074 133.275 54.2613 133.321 52.9616C133.407 50.5298 133.387 48.6717 133.244 46.3363C133.183 45.3666 133.005 42.417 130.249 42.417L130.254 42.4221Z" fill="#1D1D1B"/>
          <path d="M147.046 46.3412C146.99 45.3715 146.812 42.4219 144.051 42.4219C143.166 42.4219 142.464 42.6757 141.966 43.1783C141.066 44.0871 141.076 45.534 141.086 46.4935C141.096 47.4226 141.081 48.3973 141.066 49.3822C141.045 50.8342 141.02 52.337 141.076 53.6722C141.127 54.8551 141.223 57.3123 144.046 57.3123C146.868 57.3123 147.072 54.2662 147.117 52.9665C147.204 50.5245 147.184 48.6664 147.041 46.3412H147.046Z" fill="#1D1D1B"/>
          <path d="M35.1762 57.8813C36.178 57.8407 37.2205 57.9676 38.1105 57.9981C40.7244 58.0844 43.3587 57.9676 45.9726 57.9473C48.7493 57.927 51.526 57.9016 54.3026 57.8813C55.3807 57.8711 56.4639 57.861 57.5421 57.8508C58.3354 57.8458 59.1287 57.861 59.9221 57.8458C60.278 57.8407 60.6493 57.8559 60.9951 57.7493C61.3409 57.6427 61.6409 57.465 61.9105 57.2365C62.1902 56.9928 62.419 56.6882 62.5767 56.3532C62.892 55.6729 62.9021 54.8758 62.6072 54.1853C62.4495 53.8249 62.2105 53.5 61.9054 53.2411C61.3358 52.7588 60.5628 52.7131 59.8407 52.6877C58.9863 52.6572 58.1269 52.6471 57.2725 52.6521C56.3622 52.6521 55.4519 52.6572 54.5416 52.6572C52.7465 52.6572 50.9564 52.6674 49.1612 52.6724C47.3762 52.6775 45.5963 52.6826 43.8113 52.6877C41.6551 52.6927 39.4988 52.6978 37.3426 52.7029C37.2409 52.7029 37.1443 52.7029 37.0426 52.7029C35.9644 52.7029 34.8507 52.6014 33.7879 52.4135C32.0893 52.114 32.0588 50.8499 31.9367 49.3268C31.7994 47.621 31.7232 45.905 31.7181 44.1941C31.7079 42.1633 31.5655 39.9295 32.1656 37.9699C32.369 37.2997 32.7555 36.6651 33.3302 36.3047C33.7675 36.0356 34.2862 35.9442 34.7897 35.8782C36.356 35.6802 37.9986 35.7716 39.57 35.7564C42.4281 35.736 45.281 35.736 48.139 35.7411C50.1681 35.7411 52.1972 35.7513 54.2314 35.7564C55.7316 35.7564 57.2318 35.8122 58.7371 35.8122C59.9933 35.8122 61.7071 35.6853 62.5004 35.0405C63.0903 34.5633 63.3497 33.8678 63.3497 33.1215C63.3497 31.2024 61.4731 30.4713 59.8305 30.4713C58.2083 30.4713 56.5962 30.5272 54.979 30.517C54.4348 30.517 53.8856 30.512 53.3415 30.5069C48.2407 30.4815 43.14 30.4612 38.0393 30.446C35.4864 30.4409 32.9386 30.4358 30.3857 30.4358C29.5974 30.4358 27.8785 30.3393 27.4209 30.6541C26.7038 31.1618 26.7547 32.5579 26.7547 33.3601C26.7648 38.3405 26.775 43.3158 26.7852 48.2962C26.7852 49.9512 26.7852 51.6012 26.7699 53.2563C26.7292 58.5921 26.6275 63.9278 26.6428 69.2636C26.6428 72.4773 26.7038 74.0612 26.8259 77.2698C26.836 77.5237 26.7597 79.0772 27.2327 79.5341C27.787 80.0672 29.0329 79.9961 29.3381 80.0062C30.7112 80.057 30.5637 79.9707 31.9367 79.9707C32.6385 79.9707 33.3403 79.9707 34.0421 79.9707C35.3338 79.9707 36.6255 79.9707 37.9122 79.9707C39.5649 79.9707 41.2228 79.9707 42.8756 79.9707C44.6657 79.9707 46.4608 79.9707 48.2509 79.9707C50.041 79.9707 51.6582 79.9707 53.3618 79.9707C54.4247 79.9707 55.4875 79.9707 56.5504 79.9707C57.5827 79.9707 58.6253 80.057 59.6627 80.0316C61.2595 79.991 62.8309 79.1381 62.8309 77.3561C62.8309 76.4931 62.3936 75.6655 61.6816 75.1782C60.7459 74.5385 59.7136 74.772 58.6609 74.772C58.3049 74.772 57.9489 74.772 57.598 74.772C56.708 74.772 55.8181 74.7619 54.9281 74.7619L50.8496 74.7415C50.8191 74.7415 50.7886 74.7415 50.753 74.7415C45.2607 74.7212 42.8603 74.7111 37.3629 74.706C36.1679 74.706 34.1133 74.6857 32.9437 73.584C31.7028 72.4163 31.8859 71.269 31.8859 70.1521C31.8859 68.8118 31.8859 67.4715 31.8808 66.1261C31.8808 64.6843 31.8808 63.2475 31.8757 61.8057C31.8757 60.633 31.8706 62.7094 31.8656 61.5366C31.8656 61.4909 31.7282 59.4551 32.5317 58.7698C33.259 58.1504 34.2049 57.9422 35.1864 57.9016L35.1762 57.8813Z" fill="#1D1D1B"/>
          <path d="M151.506 57.7492C150.052 57.6071 148.434 58.5209 148.256 60.308C147.677 66.1006 144.208 70.8475 138.736 73.325C132.553 76.1224 125.092 75.4573 119.727 71.6293C113.263 67.0196 112.567 58.6377 113.121 52.4134C113.808 44.7118 117.678 38.8328 123.729 36.2792C129.857 33.6951 137.129 34.68 142.703 38.8481C144.015 39.8279 145.317 39.3101 146.024 38.3658C146.914 37.1778 146.965 35.2994 145.505 34.2129C139.245 29.532 130.768 28.1664 123.389 30.6439C115.252 33.3752 109.531 40.3305 108.081 49.2607C107.247 54.3883 106.24 67.1262 114.84 74.645C119.229 78.4831 125.001 80.5545 130.946 80.5545C132.68 80.5545 134.434 80.3768 136.168 80.0163C145.515 78.077 152.716 69.9997 153.678 60.374C153.84 58.7291 152.706 57.8711 151.506 57.7492Z" fill="#1D1D1B"/>
          <path d="M108.224 77.4474C108.224 76.6554 107.919 75.8736 107.288 75.3811C106.118 74.4622 104.486 74.6247 103.092 74.6298C98.9478 74.6602 94.8031 74.7415 90.6585 74.6958C88.5836 74.6755 86.5138 74.6247 84.444 74.5181C82.9031 74.4419 80.7469 74.4115 79.7349 72.995C79.0687 72.066 79.0483 70.8932 78.9721 69.8017C78.8805 68.5122 78.7788 67.2226 78.7178 65.9331C78.4788 61.0644 78.6619 56.1957 78.6619 51.3219V35.472C78.6619 34.8932 78.6619 34.3144 78.6619 33.7357C78.6619 33.0909 78.6008 32.5071 78.3008 31.908C78.1431 31.5983 77.9346 31.314 77.6804 31.0754C77.1667 30.5982 76.4904 30.3291 75.7886 30.3291C74.9444 30.3291 74.146 30.7454 73.6171 31.3952C73.017 32.1263 72.9153 32.9285 72.9153 33.8423C72.9153 34.3347 72.9153 34.8272 72.9153 35.3197C72.9153 36.3046 72.9153 37.2895 72.9153 38.2693C72.9153 40.2391 72.9153 42.2039 72.9153 44.1737C72.9153 48.1083 72.9153 52.0428 72.9153 55.9774C72.9153 59.912 72.9204 63.8465 72.9254 67.7811C72.9254 68.2938 72.9254 68.8066 72.9254 69.3143C72.9254 71.736 72.9356 74.1525 72.9407 76.5742C72.9407 77.686 73.0221 78.9654 73.912 79.6355C74.5325 80.1077 75.3716 80.128 76.1547 80.1331C85.5069 80.1788 94.8591 80.2295 104.211 80.2752C105.157 80.2752 106.159 80.2752 106.978 79.798C107.802 79.3259 108.229 78.3765 108.224 77.4373V77.4474Z" fill="#1D1D1B"/>
        </svg>
        <span className="text-xs text-muted-foreground">Sandbox v0</span>
      </div>

      {/* Rive file dropdown */}
      <div className="px-3 pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted">
              <span className="truncate text-foreground">{rive.fileName || 'Rive file name'}</span>
              <ChevronDown className="size-3.5 shrink-0 ml-2 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-zinc-900 border-zinc-700/60 text-zinc-100 p-1.5">
            <DropdownMenuItem onClick={() => { configSerializer.save(); logger.log('system', 'Config saved') }} className="text-xs font-light focus:bg-zinc-800 focus:text-zinc-100 px-3 py-1.5">
              Save config
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => configSerializer.exportJSON()} className="text-xs font-light focus:bg-zinc-800 focus:text-zinc-100 px-3 py-1.5">
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => configInputRef.current?.click()} className="text-xs font-light focus:bg-zinc-800 focus:text-zinc-100 px-3 py-1.5">
              Load config
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-700/60" />
            <DropdownMenuItem onClick={() => riveInputRef.current?.click()} className="text-xs font-light focus:bg-zinc-800 focus:text-zinc-100 px-3 py-1.5">
              Replace Rive file
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { riveControllerRef.current = null; clearRive() }}
              className="text-xs font-light text-red-400 focus:bg-zinc-800 focus:text-red-400 px-3 py-1.5"
            >
              Remove Rive file
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={riveInputRef}
          type="file"
          accept=".riv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleRiveFile(f); e.target.value = '' } }}
        />
        <input
          ref={configInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleConfigFile}
        />
      </div>

      <Separator className="mx-3 w-auto mb-4" />

      {/* Modules section */}
      <div className="px-3 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-foreground">Modules</span>
          <Button variant="ghost" size="icon" className="size-5 text-muted-foreground">
            <Plus className="size-3" />
          </Button>
        </div>
        <div className="flex flex-col gap-0.5">
          {LAYERS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedLayer(key)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs font-light transition-colors',
                selectedLayer === key
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
