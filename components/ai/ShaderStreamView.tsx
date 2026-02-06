'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ShaderCode {
  id: string
  name: string
  fragment_shader: string
  vertex_shader?: string
  timestamp: string
}

interface ThinkingBlock {
  id: string
  content: string
  timestamp: string
  type?: string
}

interface ShaderStreamViewProps {
  sessionId: string
  agentName: string
}

const DEFAULT_VERTEX = `
attribute vec4 position;
void main() {
  gl_Position = position;
}
`

const DEFAULT_FRAGMENT = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0, 2, 4));
  gl_FragColor = vec4(col, 1.0);
}
`

export default function ShaderStreamView({ sessionId, agentName }: ShaderStreamViewProps) {
  const [thinking_blocks, set_thinking_blocks] = useState<ThinkingBlock[]>([])
  const [shaders, set_shaders] = useState<ShaderCode[]>([])
  const [active_shader, set_active_shader] = useState<ShaderCode | null>(null)
  const [shader_error, set_shader_error] = useState<string | null>(null)
  const [show_code, set_show_code] = useState(false)
  const [fps, set_fps] = useState(0)
  const [elapsed_time, set_elapsed_time] = useState(0)

  const canvas_ref = useRef<HTMLCanvasElement>(null)
  const gl_ref = useRef<WebGLRenderingContext | null>(null)
  const program_ref = useRef<WebGLProgram | null>(null)
  const animation_ref = useRef<number | null>(null)
  const start_time_ref = useRef<number>(Date.now())
  const thinking_ref = useRef<HTMLDivElement>(null)
  const frame_count_ref = useRef<number>(0)
  const last_fps_time_ref = useRef<number>(Date.now())

  // Initialize WebGL
  const init_gl = useCallback(() => {
    const canvas = canvas_ref.current
    if (canvas === null) return

    const gl = canvas.getContext('webgl')
    if (gl === null) {
      set_shader_error('WebGL not supported')
      return
    }
    gl_ref.current = gl

    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ])
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
  }, [])

  // Compile shader
  const compile_shader = useCallback((gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type)
    if (shader === null) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      set_shader_error(`Shader error: ${info}`)
      gl.deleteShader(shader)
      return null
    }
    return shader
  }, [])

  // Build shader program
  const build_program = useCallback((fragment_source: string, vertex_source?: string) => {
    const gl = gl_ref.current
    if (gl === null) return

    set_shader_error(null)

    if (program_ref.current !== null) {
      gl.deleteProgram(program_ref.current)
    }

    const vertex_shader = compile_shader(gl, gl.VERTEX_SHADER, vertex_source !== undefined ? vertex_source : DEFAULT_VERTEX)
    const fragment_shader = compile_shader(gl, gl.FRAGMENT_SHADER, fragment_source)

    if (vertex_shader === null || fragment_shader === null) return

    const program = gl.createProgram()
    if (program === null) return

    gl.attachShader(program, vertex_shader)
    gl.attachShader(program, fragment_shader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      set_shader_error(`Link error: ${info}`)
      return
    }

    program_ref.current = program
    gl.useProgram(program)

    const position_loc = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position_loc)
    gl.vertexAttribPointer(position_loc, 2, gl.FLOAT, false, 0, 0)
  }, [compile_shader])

  // Render loop
  const render = useCallback(() => {
    const gl = gl_ref.current
    const program = program_ref.current
    const canvas = canvas_ref.current

    if (gl === null || program === null || canvas === null) {
      animation_ref.current = requestAnimationFrame(render)
      return
    }

    // FPS counter
    frame_count_ref.current += 1
    const now = Date.now()
    const fps_delta = now - last_fps_time_ref.current
    if (fps_delta >= 1000) {
      set_fps(Math.round((frame_count_ref.current * 1000) / fps_delta))
      frame_count_ref.current = 0
      last_fps_time_ref.current = now
    }

    // Update uniforms
    const time_loc = gl.getUniformLocation(program, 'u_time')
    const res_loc = gl.getUniformLocation(program, 'u_resolution')
    const mouse_loc = gl.getUniformLocation(program, 'u_mouse')

    const current_elapsed = (now - start_time_ref.current) / 1000
    set_elapsed_time(current_elapsed)

    if (time_loc !== null) gl.uniform1f(time_loc, current_elapsed)
    if (res_loc !== null) gl.uniform2f(res_loc, canvas.width, canvas.height)
    if (mouse_loc !== null) gl.uniform2f(mouse_loc, 0.5, 0.5)

    // Draw
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    animation_ref.current = requestAnimationFrame(render)
  }, [])

  // Initialize
  useEffect(() => {
    init_gl()
    build_program(DEFAULT_FRAGMENT)
    render()

    return () => {
      if (animation_ref.current !== null) {
        cancelAnimationFrame(animation_ref.current)
      }
    }
  }, [init_gl, build_program, render])

  // Update shader when active_shader changes
  useEffect(() => {
    if (active_shader !== null) {
      build_program(active_shader.fragment_shader, active_shader.vertex_shader)
      start_time_ref.current = Date.now()
    }
  }, [active_shader, build_program])

  // Load initial data + subscribe
  useEffect(() => {
    const supabase = createClient()

    const handle_event = (event: { id: string; event_type: string; data: Record<string, unknown>; created_at: string }) => {
      const event_type = event.event_type
      const event_data = event.data

      if (event_type === 'thinking' || event_type === 'thought') {
        set_thinking_blocks(prev => [...prev.slice(-50), {
          id: event.id,
          content: String(event_data.content || event_data.text || ''),
          type: typeof event_data.type === 'string' ? event_data.type : undefined,
          timestamp: event.created_at,
        }])
      } else if (event_type === 'shader' || event_type === 'shader_code') {
        const shader: ShaderCode = {
          id: event.id,
          name: typeof event_data.name === 'string' ? event_data.name : 'Untitled',
          fragment_shader: String(event_data.fragment_shader || event_data.code || ''),
          vertex_shader: typeof event_data.vertex_shader === 'string' ? event_data.vertex_shader : undefined,
          timestamp: event.created_at,
        }
        set_shaders(prev => [shader, ...prev])
        set_active_shader(shader)
      } else if (event_type === 'shader_error') {
        set_shader_error(String(event_data.error || event_data.message || ''))
      }
    }

    const fetch_events = async () => {
      const { data } = await supabase
        .from('ai_stream_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (data !== null) {
        for (const event of data) {
          handle_event({
            id: event.id,
            event_type: event.event_type || event.type,
            data: typeof event.data === 'object' && event.data !== null ? event.data : {},
            created_at: event.created_at,
          })
        }
      }
    }

    fetch_events()

    const channel = supabase
      .channel(`shader-stream-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_stream_events',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const raw = payload.new as Record<string, unknown>
        handle_event({
          id: String(raw.id),
          event_type: String(raw.event_type || raw.type || ''),
          data: typeof raw.data === 'object' && raw.data !== null ? raw.data as Record<string, unknown> : {},
          created_at: String(raw.created_at),
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  useEffect(() => {
    if (thinking_ref.current !== null) {
      thinking_ref.current.scrollTop = thinking_ref.current.scrollHeight
    }
  }, [thinking_blocks])

  return (
    <div className="h-full flex">
      {/* Thinking sidebar */}
      <div className="w-80 min-w-80 border-r border-white/[0.04] flex flex-col bg-black/30">
        <div className="text-xs uppercase tracking-wider text-white/30 px-4 py-3 border-b border-white/[0.04]">
          Thinking
        </div>
        <div ref={thinking_ref} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {thinking_blocks.length === 0 && (
            <div className="text-white/20 text-sm text-center py-8">Waiting for shader ideas...</div>
          )}
          {thinking_blocks.map(block => (
            <div key={block.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              {block.type !== undefined && (
                <div className="text-[10px] uppercase tracking-wider text-cyan-400 mb-1">{block.type}</div>
              )}
              <p className="text-sm text-white/70 leading-relaxed">{block.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <canvas
            ref={canvas_ref}
            width={800}
            height={600}
            className="w-full h-full"
          />

          {/* Error overlay */}
          {shader_error !== null && (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-red-500/10 border-t border-red-500/30">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-sm flex-shrink-0">Error:</span>
                <pre className="text-xs text-red-300/70 font-mono whitespace-pre-wrap overflow-x-auto">{shader_error}</pre>
              </div>
            </div>
          )}

          {/* FPS + time overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white/50 tabular-nums backdrop-blur">
              {fps} FPS
            </span>
            <span className="px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white/50 tabular-nums backdrop-blur">
              t={elapsed_time.toFixed(1)}s
            </span>
          </div>

          {/* Shader name overlay */}
          {active_shader !== null && (
            <div className="absolute top-3 left-3">
              <span className="px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-cyan-400 backdrop-blur">
                {active_shader.name}
              </span>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-white/[0.04] bg-black/20">
          <button
            onClick={() => set_show_code(!show_code)}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${
              show_code
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-white/[0.06] text-white/60 hover:bg-white/10'
            }`}
          >
            {show_code ? 'Hide Code' : 'Show Code'}
          </button>
          <button
            onClick={() => {
              start_time_ref.current = Date.now()
            }}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-xs text-white/60 transition"
          >
            Reset Time
          </button>

          <div className="flex-1" />

          {/* Uniform values */}
          <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono">
            <span>iResolution: 800x600</span>
            <span>iTime: {elapsed_time.toFixed(2)}</span>
          </div>
        </div>

        {/* Code view */}
        {show_code && active_shader !== null && (
          <div className="max-h-64 overflow-y-auto border-t border-white/[0.04] bg-black/40">
            <div className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-cyan-400 mb-2">Fragment Shader</div>
              <pre className="font-mono text-xs text-white/60 whitespace-pre-wrap overflow-x-auto">
                {active_shader.fragment_shader}
              </pre>
              {active_shader.vertex_shader !== undefined && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-cyan-400 mb-2 mt-4">Vertex Shader</div>
                  <pre className="font-mono text-xs text-white/60 whitespace-pre-wrap overflow-x-auto">
                    {active_shader.vertex_shader}
                  </pre>
                </>
              )}
            </div>
          </div>
        )}

        {/* Shader history */}
        {shaders.length > 1 && (
          <div className="border-t border-white/[0.04] p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-white/30">Versions</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-white/40">
                {shaders.length}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {shaders.map(shader => (
                <button
                  key={shader.id}
                  onClick={() => set_active_shader(shader)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs transition ${
                    active_shader !== null && active_shader.id === shader.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-white/[0.03] text-white/50 border border-white/[0.04] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="font-medium">{shader.name}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">
                    {new Date(shader.timestamp).toLocaleTimeString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
