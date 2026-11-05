"""Resume verified DesktopHut original imports; temporary binaries never enter source."""
import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src/assets/wallpapers/native"
TEMP = pathlib.Path("/tmp/wallpaper-hq/media")
TEMP.mkdir(parents=True, exist_ok=True)
(ASSETS / "checkpoints").mkdir(parents=True, exist_ok=True)


def command(args, timeout=240):
    result = subprocess.run(args, capture_output=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace")[-350:])
    return result.stdout


def upload(source, filename):
    target = ASSETS / (filename + ".asset.json")
    if target.exists():
        return target
    for attempt in range(2):
        try:
            output = command(["lovable-assets", "create", "--file", str(source), "--filename", filename,
                              "--content-type", "image/jpeg" if filename.endswith(".jpg") else "video/mp4"], 180)
            pointer = json.loads(output)
            if pointer.get("size") != source.stat().st_size or not pointer.get("url"):
                raise ValueError("Upload did not match source size")
            # Preserve the CLI's verbatim output, never synthesize asset pointers.
            target.write_bytes(output)
            return target
        except Exception:
            if attempt:
                raise


def import_one(item):
    checkpoint = ASSETS / "checkpoints" / (item["id"] + ".json")
    if checkpoint.exists():
        saved = json.loads(checkpoint.read_text())
        if saved.get("status") == "complete":
            return saved
    result = {"id": item["id"], "source": item["source"], "previousUrls": item["previousUrls"]}
    work = pathlib.Path(tempfile.mkdtemp(prefix="original-", dir=TEMP))
    try:
        url = item.get("originalUrl") or item.get("archiveUrl")
        if not url:
            raise ValueError(item.get("error", "No original download"))
        source = work / ("source.zip" if item.get("archiveUrl") else "source.mp4")
        command(["curl", "--fail", "--location", "--retry", "2", "--connect-timeout", "20",
                 "--max-time", "240", "--silent", "--show-error", url, "--output", str(source)], 300)
        if item.get("archiveUrl"):
            with zipfile.ZipFile(source) as archive:
                videos = [entry for entry in archive.infolist()
                          if pathlib.PurePosixPath(entry.filename).suffix.lower() in (".mp4", ".m4v", ".webm", ".mov")]
                if not videos:
                    raise ValueError("Provider archive is a scene project, not a browser-playable video")
                entry = max(videos, key=lambda video: video.file_size)
                video = work / "source.mp4"
                with archive.open(entry) as incoming, video.open("wb") as outgoing:
                    shutil.copyfileobj(incoming, outgoing)
                source = video
        info = json.loads(command(["ffprobe", "-v", "error", "-select_streams", "v:0",
                                  "-show_entries", "stream=width,height,codec_name", "-of", "json", str(source)], 45))
        stream = next(iter(info.get("streams", [])), None)
        if not stream or not stream.get("width") or not stream.get("height"):
            raise ValueError("Original has no readable video stream")
        if stream.get("codec_name") not in ("h264", "hevc", "av1", "vp8", "vp9"):
            raise ValueError("Original codec is not browser-compatible")
        digest = hashlib.file_digest(source.open("rb"), "sha256").hexdigest()
        video_pointer = upload(source, item["id"] + "-native.mp4")
        poster = work / "poster.jpg"
        command(["ffmpeg", "-v", "error", "-threads", "1", "-i", str(source), "-frames:v", "1",
                 "-q:v", "2", "-threads", "1", "-y", str(poster)], 60)
        poster_pointer = upload(poster, item["id"] + "-native.jpg")
        result.update(status="complete", resolution=f'{stream["width"]}x{stream["height"]}',
                      width=stream["width"], height=stream["height"], codec=stream["codec_name"],
                      originalUrl=url, bytes=source.stat().st_size, sha256=digest,
                      videoPointer=str(video_pointer.relative_to(ROOT / "src")),
                      imagePointer=str(poster_pointer.relative_to(ROOT / "src")))
    except Exception as error:
        result.update(status="unavailable", error=str(error)[:350])
    finally:
        checkpoint.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
        shutil.rmtree(work, ignore_errors=True)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=987)
    parser.add_argument("--workers", type=int, default=12)
    args = parser.parse_args()
    items = json.loads((ASSETS / "manifest.json").read_text())[args.start:args.end]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        complete = unavailable = 0
        for result in pool.map(import_one, items):
            complete += result["status"] == "complete"
            unavailable += result["status"] != "complete"
            if (complete + unavailable) % 25 == 0 or result["status"] != "complete":
                print("Imported", complete, "unavailable", unavailable, result["id"],
                      result.get("error", result.get("resolution")), flush=True)
    print("Batch finished:", complete, "originals;", unavailable, "unavailable", flush=True)