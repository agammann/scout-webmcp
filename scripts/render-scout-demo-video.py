from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


SCENES = tuple(range(1, 9))
FPS = 30
TAIL_SECONDS = 0.65


def run(command: list[str]) -> None:
    print("+", subprocess.list2cmdline(command), flush=True)
    subprocess.run(command, check=True)


def probe_duration(ffprobe: Path, media: Path) -> float:
    result = subprocess.run(
        [
            str(ffprobe),
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(media),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def probe_streams(ffprobe: Path, media: Path) -> dict[str, object]:
    result = subprocess.run(
        [
            str(ffprobe),
            "-v",
            "error",
            "-show_entries",
            "format=duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
            "-of",
            "json",
            str(media),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def render_scene(
    ffmpeg: Path,
    frame: Path,
    narration: Path,
    output: Path,
    duration: float,
) -> None:
    fade_out = max(duration - 0.28, 0)
    audio_fade_out = max(duration - 0.32, 0)
    video_filter = (
        "zoompan="
        "z='min(zoom+0.000025,1.018)':"
        "x='iw/2-(iw/zoom/2)':"
        "y='ih/2-(ih/zoom/2)':"
        f"d=1:s=1920x1080:fps={FPS},"
        "format=yuv420p,"
        "fade=t=in:st=0:d=0.22,"
        f"fade=t=out:st={fade_out:.3f}:d=0.28"
    )
    audio_filter = (
        "loudnorm=I=-16:LRA=7:TP=-1.5,"
        "aformat=sample_rates=48000:channel_layouts=stereo,"
        f"apad=pad_dur={TAIL_SECONDS:.2f},"
        "afade=t=in:st=0:d=0.08,"
        f"afade=t=out:st={audio_fade_out:.3f}:d=0.32"
    )
    run(
        [
            str(ffmpeg),
            "-hide_banner",
            "-loglevel",
            "warning",
            "-y",
            "-loop",
            "1",
            "-framerate",
            str(FPS),
            "-i",
            str(frame),
            "-i",
            str(narration),
            "-vf",
            video_filter,
            "-af",
            audio_filter,
            "-t",
            f"{duration:.3f}",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            str(FPS),
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-movflags",
            "+faststart",
            "-shortest",
            str(output),
        ]
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render the Scout WebMCP Challenge demo from scene images and narration."
    )
    parser.add_argument("--ffmpeg", required=True, type=Path)
    parser.add_argument("--ffprobe", required=True, type=Path)
    parser.add_argument("--frames", required=True, type=Path)
    parser.add_argument("--audio", required=True, type=Path)
    parser.add_argument("--work-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for binary in (args.ffmpeg, args.ffprobe):
        if not binary.is_file():
            raise FileNotFoundError(binary)

    args.work_dir.mkdir(parents=True, exist_ok=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)

    clips: list[Path] = []
    for scene in SCENES:
        frame = args.frames / f"scene-{scene:02d}.png"
        narration = args.audio / f"scene-{scene:02d}.mp3"
        if not frame.is_file():
            raise FileNotFoundError(frame)
        if not narration.is_file():
            raise FileNotFoundError(narration)

        duration = probe_duration(args.ffprobe, narration) + TAIL_SECONDS
        clip = args.work_dir / f"scene-{scene:02d}.mp4"
        render_scene(args.ffmpeg, frame, narration, clip, duration)
        clips.append(clip)

    concat_file = args.work_dir / "concat.txt"
    concat_file.write_text(
        "".join(f"file '{clip.as_posix()}'\n" for clip in clips),
        encoding="utf-8",
    )
    assembled = args.work_dir / "scout-demo-assembled.mp4"
    run(
        [
            str(args.ffmpeg),
            "-hide_banner",
            "-loglevel",
            "warning",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c:v",
            "copy",
            "-af",
            "aresample=async=1:first_pts=0",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-avoid_negative_ts",
            "make_zero",
            "-movflags",
            "+faststart",
            str(assembled),
        ]
    )
    shutil.copy2(assembled, args.output)

    metadata = probe_streams(args.ffprobe, args.output)
    duration = float(metadata["format"]["duration"])
    if duration >= 180:
        raise RuntimeError(f"Demo is {duration:.3f}s; challenge limit is under 180s")
    print(json.dumps(metadata, indent=2), flush=True)


if __name__ == "__main__":
    main()
