import sys
import os
import pty
import select
import subprocess
import struct
import fcntl
import termios

def main():
    # Get shell from env
    shell = os.environ.get('SHELL', '/bin/bash')
    
    # Create PTY
    master_fd, slave_fd = pty.openpty()
    
    # Set initial size (80x24)
    # Ideally we'd read this from arguments or env
    try:
        winsize = struct.pack("HHHH", 24, 80, 0, 0)
        fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
    except:
        pass

    # Spawn process connected to slave end of PTY
    p = subprocess.Popen(
        [shell],
        preexec_fn=os.setsid,
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        env=os.environ,
        close_fds=True
    )
    
    os.close(slave_fd)
    
    # Use select loop to shuttle data
    try:
        while p.poll() is None:
            r, w, e = select.select([sys.stdin.fileno(), master_fd], [], [], 0.1)
            
            if sys.stdin.fileno() in r:
                try:
                    d = os.read(sys.stdin.fileno(), 1024)
                    if not d:
                        # EOF from parent (Node)
                        break
                    os.write(master_fd, d)
                except OSError:
                    break
            
            if master_fd in r:
                try:
                    o = os.read(master_fd, 1024)
                    if not o:
                        # EOF from child (Shell)
                        break
                    os.write(sys.stdout.fileno(), o)
                    sys.stdout.flush()
                except OSError:
                    break
            
            # Check p status again if select timed out
    except Exception:
        pass
    finally:
        os.close(master_fd)
        if p.poll() is None:
            p.terminate()

if __name__ == "__main__":
    main()