"""
Question bank data and seeding function for Hacktober 2026.
Contains 50 realistic cybersecurity questions across 3 rounds.
"""
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Round, Question, AnswerOption

ROUND_1_QUESTIONS: List[Dict[str, Any]] = [
    {
        "question_text": "Which of the following is the most secure method for Multi-Factor Authentication (MFA)?",
        "topic": "Authentication & MFA",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "Hardware security keys (FIDO2/WebAuthn) provide cryptographic proof and are immune to SIM-swapping and adversary-in-the-middle phishing attacks.",
        "options": [
            {"label": "A", "text": "SMS text message with a 6-digit one-time code", "correct": False},
            {"label": "B", "text": "Hardware security key (e.g., FIDO2 / YubiKey)", "correct": True},
            {"label": "C", "text": "Security questions based on personal memories", "correct": False},
            {"label": "D", "text": "Automated voice phone call reciting a passcode", "correct": False},
        ],
    },
    {
        "question_text": "What type of attack involves an adversary registering a domain name that is slightly misspelled from a legitimate corporate or banking domain?",
        "topic": "Phishing & Social Engineering",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "Typosquatting (URL hijacking) targets users who inadvertently mistype a website address in their web browser.",
        "options": [
            {"label": "A", "text": "Typosquatting", "correct": True},
            {"label": "B", "text": "SQL Injection", "correct": False},
            {"label": "C", "text": "DNS Tunneling", "correct": False},
            {"label": "D", "text": "Session Replay", "correct": False},
        ],
    },
    {
        "question_text": "Which malware type encrypts user files and demands financial payment in cryptocurrency for the decryption key?",
        "topic": "Malware Analysis",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "Ransomware is malicious software designed to block access to a computer system or computer files until a sum of money is paid.",
        "options": [
            {"label": "A", "text": "Spyware", "correct": False},
            {"label": "B", "text": "Rootkit", "correct": False},
            {"label": "C", "text": "Ransomware", "correct": True},
            {"label": "D", "text": "Adware", "correct": False},
        ],
    },
    {
        "question_text": "What security objective is primarily compromised when an attacker performs a Denial of Service (DoS) attack?",
        "topic": "Security Principles (CIA Triad)",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "The CIA Triad stands for Confidentiality, Integrity, and Availability. A DoS attack exhausts resources, making services unavailable to legitimate users.",
        "options": [
            {"label": "A", "text": "Confidentiality", "correct": False},
            {"label": "B", "text": "Integrity", "correct": False},
            {"label": "C", "text": "Availability", "correct": True},
            {"label": "D", "text": "Non-repudiation", "correct": False},
        ],
    },
    {
        "question_text": "Why is HTTP considered insecure for transmitting confidential data such as passwords and credit card numbers?",
        "topic": "Network Security",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "Standard HTTP transmits traffic in cleartext without encryption, allowing any eavesdropper on the network path to read or tamper with packets.",
        "options": [
            {"label": "A", "text": "HTTP does not support transmission of binary data", "correct": False},
            {"label": "B", "text": "Traffic is sent in unencrypted plaintext, vulnerable to packet sniffing", "correct": True},
            {"label": "C", "text": "HTTP requires root privileges to operate on port 80", "correct": False},
            {"label": "D", "text": "HTTP servers reject passwords longer than 12 characters", "correct": False},
        ],
    },
    {
        "question_text": "In the context of information security, what is 'Whaling'?",
        "topic": "Social Engineering",
        "difficulty": "medium",
        "point_value": 4.0,
        "explanation": "Whaling is a highly targeted phishing attack aimed specifically at senior executives, board members, or high-profile public figures.",
        "options": [
            {"label": "A", "text": "Broadly spraying spam emails to millions of random addresses", "correct": False},
            {"label": "B", "text": "A targeted spear-phishing attack directed specifically at high-profile executives or VIPs", "correct": True},
            {"label": "C", "text": "Using automated bots to flood an ocean database", "correct": False},
            {"label": "D", "text": "Brute-forcing wireless WPA2 handshakes over long distances", "correct": False},
        ],
    },
    {
        "question_text": "Which of the following password hashing algorithms is specifically designed with adjustable work factor (salt + cost) to resist GPU brute-force attacks?",
        "topic": "Cryptography & Passwords",
        "difficulty": "medium",
        "point_value": 4.0,
        "explanation": "Bcrypt, Argon2, and PBKDF2 are deliberately slow and memory-intensive hashing functions designed to resist parallelized GPU/ASIC cracking.",
        "options": [
            {"label": "A", "text": "MD5", "correct": False},
            {"label": "B", "text": "SHA-1", "correct": False},
            {"label": "C", "text": "Bcrypt", "correct": True},
            {"label": "D", "text": "CRC32", "correct": False},
        ],
    },
    {
        "question_text": "What is the primary danger of connecting to an unencrypted public Wi-Fi network without a VPN?",
        "topic": "Network Security",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "An adversary on the same Wi-Fi network can perform Evil Twin or ARP spoofing attacks to intercept unencrypted traffic and harvest session cookies.",
        "options": [
            {"label": "A", "text": "The laptop battery discharges 5x faster", "correct": False},
            {"label": "B", "text": "Adversaries on the same subnet can inspect unencrypted traffic or execute Man-in-the-Middle (MitM) attacks", "correct": True},
            {"label": "C", "text": "The operating system automatically uninstalls security patches", "correct": False},
            {"label": "D", "text": "The browser cache is deleted immediately", "correct": False},
        ],
    },
    {
        "question_text": "Which principle states that a user or system entity should be assigned only the minimal set of privileges required to perform their authorized duties?",
        "topic": "Access Control",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "The Principle of Least Privilege (PoLP) ensures that compromising a single credential or account minimizes the potential blast radius.",
        "options": [
            {"label": "A", "text": "Principle of Least Privilege", "correct": True},
            {"label": "B", "text": "Defense in Depth", "correct": False},
            {"label": "C", "text": "Fail-Safe Defaults", "correct": False},
            {"label": "D", "text": "Separation of Duties", "correct": False},
        ],
    },
    {
        "question_text": "What is the key difference between a Worm and a Virus?",
        "topic": "Malware Architecture",
        "difficulty": "medium",
        "point_value": 4.0,
        "explanation": "A computer worm is self-replicating and can propagate across networks without requiring user interaction or a host file, unlike a virus.",
        "options": [
            {"label": "A", "text": "Viruses only infect mobile devices, while worms only infect servers", "correct": False},
            {"label": "B", "text": "A worm propagates independently across networks without needing human activation or a host file", "correct": True},
            {"label": "C", "text": "A worm is written in C++, while viruses are written in Python", "correct": False},
            {"label": "D", "text": "A virus never modifies disk files", "correct": False},
        ],
    },
    {
        "question_text": "What does the lock icon in the browser address bar indicate about the website?",
        "topic": "Web Security",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "The padlock icon indicates that communication between your browser and the website is encrypted using TLS, and the domain matches a trusted certificate.",
        "options": [
            {"label": "A", "text": "The website content has been vetted and certified 100% free of scams or malicious intent", "correct": False},
            {"label": "B", "text": "Data in transit is encrypted with TLS and authenticated to the domain on the certificate", "correct": True},
            {"label": "C", "text": "The website server is located inside a high-security military data bunker", "correct": False},
            {"label": "D", "text": "Your personal computer has no viruses or malware", "correct": False},
        ],
    },
    {
        "question_text": "What is 'Smishing'?",
        "topic": "Phishing & Social Engineering",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "Smishing is a blend of 'SMS' and 'phishing', where fraudulent text messages are sent to deceive individuals into sharing sensitive info or clicking malicious links.",
        "options": [
            {"label": "A", "text": "Phishing conducted via Short Message Service (SMS) text messages", "correct": True},
            {"label": "B", "text": "A technique to sniff Bluetooth signals in public places", "correct": False},
            {"label": "C", "text": "Sending malicious PDF attachments through workplace Slack", "correct": False},
            {"label": "D", "text": "Overclocking server memory to induce voltage bit-flips", "correct": False},
        ],
    },
    {
        "question_text": "What is a 'Zero-Day' vulnerability?",
        "topic": "Vulnerability Management",
        "difficulty": "medium",
        "point_value": 4.0,
        "explanation": "A zero-day vulnerability is a software flaw unknown to the vendor or public, meaning zero calendar days have passed since a patch was made available.",
        "options": [
            {"label": "A", "text": "A software flaw that causes an application to crash on the first day of each month", "correct": False},
            {"label": "B", "text": "A security vulnerability known to attackers but for which no official vendor patch exists yet", "correct": True},
            {"label": "C", "text": "A bug that only occurs when the server clock is set to 00:00 UTC", "correct": False},
            {"label": "D", "text": "A firewall rule that expires within 24 hours of creation", "correct": False},
        ],
    },
    {
        "question_text": "Which of the following represents a shoulder surfing attack?",
        "topic": "Physical Security",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "Shoulder surfing is using direct observation techniques, like looking over someone's shoulder, to get passwords, PINs, or confidential data.",
        "options": [
            {"label": "A", "text": "Spying on someone physically to view credentials or PINs as they type them", "correct": True},
            {"label": "B", "text": "Interpreting acoustic vibrations emitted by CPU cooling fans", "correct": False},
            {"label": "C", "text": "Intercepting unshielded coaxial cables with copper clamps", "correct": False},
            {"label": "D", "text": "Sending spoofed ICMP ping packets from an external network", "correct": False},
        ],
    },
    {
        "question_text": "What is the primary role of a Firewall in a network architecture?",
        "topic": "Network Security",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "A firewall monitors and controls incoming and outgoing network traffic based on predetermined security rules.",
        "options": [
            {"label": "A", "text": "To compress network traffic and accelerate fiber optic transmission speeds", "correct": False},
            {"label": "B", "text": "To filter and control incoming and outgoing network traffic according to security rules", "correct": True},
            {"label": "C", "text": "To store encrypted backups of hard drives in cloud storage", "correct": False},
            {"label": "D", "text": "To automatically defragment physical RAM in network routers", "correct": False},
        ],
    },
    {
        "question_text": "What does the acronym 'DDoS' stand for?",
        "topic": "Network Attacks",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "DDoS stands for Distributed Denial of Service, where multiple compromised systems attack a target simultaneously.",
        "options": [
            {"label": "A", "text": "Dynamic Domain Operating System", "correct": False},
            {"label": "B", "text": "Distributed Denial of Service", "correct": True},
            {"label": "C", "text": "Decentralized Defense over Silicon", "correct": False},
            {"label": "D", "text": "Direct Data on Socket", "correct": False},
        ],
    },
    {
        "question_text": "Which protocol securely assigns dynamic IP addresses to devices on a local area network?",
        "topic": "Networking Protocols",
        "difficulty": "medium",
        "point_value": 4.0,
        "explanation": "DHCP (Dynamic Host Configuration Protocol) assigns dynamic IP configurations, and DHCP Snooping is employed on switches to prevent rogue servers.",
        "options": [
            {"label": "A", "text": "DHCP", "correct": True},
            {"label": "B", "text": "BGP", "correct": False},
            {"label": "C", "text": "SNMP", "correct": False},
            {"label": "D", "text": "NTP", "correct": False},
        ],
    },
    {
        "question_text": "What is 'Vishing'?",
        "topic": "Social Engineering",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "Vishing (voice phishing) is the fraudulent practice of making phone calls or leaving voice messages purporting to be from reputable companies.",
        "options": [
            {"label": "A", "text": "Voice phishing conducted over telephone or VoIP communication", "correct": True},
            {"label": "B", "text": "Injecting malicious visual SVG tags into web forms", "correct": False},
            {"label": "C", "text": "Cloning virtual machine disks across private subnets", "correct": False},
            {"label": "D", "text": "Cracking video stream codecs on consumer smart TVs", "correct": False},
        ],
    },
    {
        "question_text": "Which of the following is considered a best practice for managing passwords across multiple web services?",
        "topic": "Password Management",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "Using a trusted password manager allows generating and storing long, complex, unique passwords for every account.",
        "options": [
            {"label": "A", "text": "Reusing one complex master password on all websites so it is never forgotten", "correct": False},
            {"label": "B", "text": "Using a dedicated password manager to generate and store distinct, complex passwords", "correct": True},
            {"label": "C", "text": "Writing passwords on sticky notes attached to the bottom of the keyboard", "correct": False},
            {"label": "D", "text": "Storing all passwords in an unencrypted Excel spreadsheet on the desktop", "correct": False},
        ],
    },
    {
        "question_text": "What type of attack involves an attacker placing themselves between a client and a server to covertly intercept communication?",
        "topic": "Network Attacks",
        "difficulty": "medium",
        "point_value": 4.0,
        "explanation": "A Man-in-the-Middle (MitM) or On-Path attack allows the attacker to intercept, inspect, and modify communications in flight.",
        "options": [
            {"label": "A", "text": "Buffer Overflow", "correct": False},
            {"label": "B", "text": "Man-in-the-Middle (MitM) Attack", "correct": True},
            {"label": "C", "text": "Cross-Site Scripting (XSS)", "correct": False},
            {"label": "D", "text": "Zip Bomb Attack", "correct": False},
        ],
    },
    {
        "question_text": "What does a 'VPN' provide to a user connected over an untrusted network?",
        "topic": "Network Security",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "A Virtual Private Network creates an encrypted tunnel between the client device and the VPN server, masking client IP and protecting data in transit.",
        "options": [
            {"label": "A", "text": "Free high-speed satellite internet anywhere on Earth", "correct": False},
            {"label": "B", "text": "An encrypted tunnel that protects internet traffic from local eavesdropping and masks the client's public IP", "correct": True},
            {"label": "C", "text": "Automatic immunity against all hardware CPU failure", "correct": False},
            {"label": "D", "text": "Permanent exemption from entering passwords on login pages", "correct": False},
        ],
    },
    {
        "question_text": "Which regulatory standard regulates the protection of personal data and privacy for individuals in the European Union?",
        "topic": "Cyber Law & Compliance",
        "difficulty": "medium",
        "point_value": 4.0,
        "explanation": "GDPR (General Data Protection Regulation) enforces strict compliance guidelines regarding personal data collection, processing, and storage.",
        "options": [
            {"label": "A", "text": "HIPAA", "correct": False},
            {"label": "B", "text": "PCI-DSS", "correct": False},
            {"label": "C", "text": "GDPR", "correct": True},
            {"label": "D", "text": "FERPA", "correct": False},
        ],
    },
    {
        "question_text": "What is the primary function of an Antivirus/EDR software signature database?",
        "topic": "Endpoint Security",
        "difficulty": "medium",
        "point_value": 4.0,
        "explanation": "Signatures contain known binary sequences, file hashes, or behavioral fingerprints used by scanning engines to identify known threats.",
        "options": [
            {"label": "A", "text": "To identify known malware by matching static cryptographic hashes and byte patterns", "correct": True},
            {"label": "B", "text": "To digitally countersign student university diplomas", "correct": False},
            {"label": "C", "text": "To decrypt SSL traffic on corporate boundary routers", "correct": False},
            {"label": "D", "text": "To benchmark the FLOPS computational capacity of graphics cards", "correct": False},
        ],
    },
    {
        "question_text": "Which port is traditionally assigned as the default listening port for secure HTTPS traffic?",
        "topic": "Network Protocols",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "HTTPS runs over port 443 by default, whereas unencrypted HTTP uses port 80.",
        "options": [
            {"label": "A", "text": "Port 21", "correct": False},
            {"label": "B", "text": "Port 80", "correct": False},
            {"label": "C", "text": "Port 443", "correct": True},
            {"label": "D", "text": "Port 8080", "correct": False},
        ],
    },
    {
        "question_text": "What is 'Social Engineering' in the realm of cybersecurity?",
        "topic": "Social Engineering",
        "difficulty": "easy",
        "point_value": 4.0,
        "explanation": "Social engineering is the psychological manipulation of people into performing actions or divulging confidential information.",
        "options": [
            {"label": "A", "text": "Manipulating individuals psychologically into divulging confidential information or breaking security protocols", "correct": True},
            {"label": "B", "text": "Developing social media mobile apps using React Native", "correct": False},
            {"label": "C", "text": "Configuring network routing tables for university residential campuses", "correct": False},
            {"label": "D", "text": "Designing community computer labs with ergonomic workstations", "correct": False},
        ],
    },
]

ROUND_2_QUESTIONS: List[Dict[str, Any]] = [
    {
        "question_text": "An attacker injects the payload ' OR '1'='1' -- into an authentication form. What specific class of vulnerability is being exploited?",
        "topic": "Web Application Security (OWASP)",
        "difficulty": "medium",
        "point_value": 10.0,
        "code_snippet": "SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = 'xxx';",
        "explanation": "This is a classic SQL Injection (SQLi) attack that alters the query logic to always evaluate to TRUE, bypassing authentication.",
        "options": [
            {"label": "A", "text": "Cross-Site Scripting (XSS)", "correct": False},
            {"label": "B", "text": "SQL Injection (SQLi)", "correct": True},
            {"label": "C", "text": "Server-Side Request Forgery (SSRF)", "correct": False},
            {"label": "D", "text": "Insecure Direct Object Reference (IDOR)", "correct": False},
        ],
    },
    {
        "question_text": "Which symmetric encryption cipher was selected by NIST as the Advanced Encryption Standard (AES) in 2001?",
        "topic": "Cryptography",
        "difficulty": "medium",
        "point_value": 10.0,
        "explanation": "Rijndael, designed by Belgian cryptographers Joan Daemen and Vincent Rijmen, was selected by NIST to become the Advanced Encryption Standard (AES).",
        "options": [
            {"label": "A", "text": "Twofish", "correct": False},
            {"label": "B", "text": "DES / Triple-DES", "correct": False},
            {"label": "C", "text": "Rijndael", "correct": True},
            {"label": "D", "text": "Blowfish", "correct": False},
        ],
    },
    {
        "question_text": "What type of XSS attack occurs when malicious JavaScript is permanently stored inside the target web application database and executed every time victims load the page?",
        "topic": "Web Application Security",
        "difficulty": "medium",
        "point_value": 10.0,
        "explanation": "Stored (Persistent) XSS occurs when injected scripts are saved on the server database, comment fields, or message boards, executing for every viewing user.",
        "options": [
            {"label": "A", "text": "Reflected XSS", "correct": False},
            {"label": "B", "text": "DOM-based XSS", "correct": False},
            {"label": "C", "text": "Stored (Persistent) XSS", "correct": True},
            {"label": "D", "text": "Blind SQL Injection", "correct": False},
        ],
    },
    {
        "question_text": "What security header instructs modern web browsers that a website can only be accessed over HTTPS and never unencrypted HTTP?",
        "topic": "Web Security Headers",
        "difficulty": "medium",
        "point_value": 10.0,
        "explanation": "HTTP Strict Transport Security (HSTS), transmitted via Strict-Transport-Security, forces browsers to use HTTPS for all future requests.",
        "options": [
            {"label": "A", "text": "Content-Security-Policy", "correct": False},
            {"label": "B", "text": "Strict-Transport-Security", "correct": True},
            {"label": "C", "text": "X-Frame-Options", "correct": False},
            {"label": "D", "text": "Access-Control-Allow-Origin", "correct": False},
        ],
    },
    {
        "question_text": "Which tool is commonly used by network administrators and penetration testers to map networks and determine open ports and running service versions?",
        "topic": "Security Tooling",
        "difficulty": "medium",
        "point_value": 10.0,
        "explanation": "Nmap (Network Mapper) is the industry standard utility for network discovery, port scanning, and OS/service version fingerprinting.",
        "options": [
            {"label": "A", "text": "Nmap", "correct": True},
            {"label": "B", "text": "John the Ripper", "correct": False},
            {"label": "C", "text": "Sqlmap", "correct": False},
            {"label": "D", "text": "Nikto", "correct": False},
        ],
    },
    {
        "question_text": "In asymmetric cryptography, which key must the recipient use to decrypt a confidential message encrypted with their public key?",
        "topic": "Public Key Infrastructure (PKI)",
        "difficulty": "medium",
        "point_value": 10.0,
        "explanation": "In asymmetric encryption (e.g. RSA, ECC), data encrypted with a person's public key can only be decrypted by that person's corresponding private key.",
        "options": [
            {"label": "A", "text": "The sender's private key", "correct": False},
            {"label": "B", "text": "The recipient's private key", "correct": True},
            {"label": "C", "text": "The sender's public key", "correct": False},
            {"label": "D", "text": "The Certificate Authority's root public key", "correct": False},
        ],
    },
    {
        "question_text": "What does a 'SYN Flood' attack exploit in the TCP connection lifecycle?",
        "topic": "Network Attacks & TCP/IP",
        "difficulty": "hard",
        "point_value": 10.0,
        "code_snippet": "Client -> SYN -> Server (allocates TCB in backlog)\nServer -> SYN-ACK -> Client\nClient -> (never responds with final ACK)",
        "explanation": "A SYN flood exploits the TCP three-way handshake by keeping connections in SYN-RECEIVED state, exhausting the server's TCP Connection Backlog Queue.",
        "options": [
            {"label": "A", "text": "The TCP sliding window size limit", "correct": False},
            {"label": "B", "text": "The server's TCP backlog queue during the three-way handshake", "correct": True},
            {"label": "C", "text": "The maximum transmission unit (MTU) calculation in UDP", "correct": False},
            {"label": "D", "text": "DNS caching forwarders on layer 7", "correct": False},
        ],
    },
    {
        "question_text": "In Linux file permissions, what numeric octal representation gives the Owner Read/Write/Execute, Group Read/Execute, and Others No permissions?",
        "topic": "Linux Systems Security",
        "difficulty": "medium",
        "point_value": 10.0,
        "code_snippet": "rwx r-x ---",
        "explanation": "rwx = 4+2+1 = 7 (Owner); r-x = 4+0+1 = 5 (Group); --- = 0 (Others). Therefore, the octal representation is 750.",
        "options": [
            {"label": "A", "text": "777", "correct": False},
            {"label": "B", "text": "755", "correct": False},
            {"label": "C", "text": "750", "correct": True},
            {"label": "D", "text": "644", "correct": False},
        ],
    },
    {
        "question_text": "What vulnerability occurs when an application receives untrusted user input and uses it to construct a server-side request to an internal resource?",
        "topic": "Web Application Security",
        "difficulty": "hard",
        "point_value": 10.0,
        "explanation": "Server-Side Request Forgery (SSRF) abuses server functionality to access or manipulate resources in the server's internal network or cloud metadata (e.g., 169.254.169.254).",
        "options": [
            {"label": "A", "text": "CSRF (Cross-Site Request Forgery)", "correct": False},
            {"label": "B", "text": "SSRF (Server-Side Request Forgery)", "correct": True},
            {"label": "C", "text": "SSTI (Server-Side Template Injection)", "correct": False},
            {"label": "D", "text": "Directory Traversal", "correct": False},
        ],
    },
    {
        "question_text": "Which Wireshark filter syntax isolates HTTP POST requests on the network capture?",
        "topic": "Packet Analysis & Forensics",
        "difficulty": "medium",
        "point_value": 10.0,
        "explanation": "In Wireshark display filter syntax, http.request.method == \"POST\" filters packets matching HTTP POST method.",
        "options": [
            {"label": "A", "text": "http.request.method == \"POST\"", "correct": True},
            {"label": "B", "text": "packet.type == http.post", "correct": False},
            {"label": "C", "text": "ip.proto == post", "correct": False},
            {"label": "D", "text": "tcp.port == 80 && flags.post", "correct": False},
        ],
    },
    {
        "question_text": "What is the primary purpose of the 'Same-Origin Policy' (SOP) implemented by web browsers?",
        "topic": "Browser Security Architecture",
        "difficulty": "hard",
        "point_value": 10.0,
        "explanation": "SOP restricts how a document or script loaded by one origin can interact with a resource from another origin, isolating malicious sites from user sessions.",
        "options": [
            {"label": "A", "text": "To prevent unauthorized websites from accessing DOM elements and storage belonging to another distinct origin", "correct": True},
            {"label": "B", "text": "To enforce identical CSS rendering engines across Chrome, Firefox, and Safari", "correct": False},
            {"label": "C", "text": "To prevent a single device from having more than one active browser window", "correct": False},
            {"label": "D", "text": "To mandate that all DNS requests resolve to the same IPv6 subnet", "correct": False},
        ],
    },
    {
        "question_text": "Which hash function produces an output digest size of 256 bits?",
        "topic": "Cryptographic Hash Functions",
        "difficulty": "medium",
        "point_value": 10.0,
        "explanation": "SHA-256 (part of the SHA-2 family) outputs a 256-bit (32-byte) hash digest.",
        "options": [
            {"label": "A", "text": "MD5", "correct": False},
            {"label": "B", "text": "SHA-1", "correct": False},
            {"label": "C", "text": "SHA-256", "correct": True},
            {"label": "D", "text": "RIPEMD-160", "correct": False},
        ],
    },
    {
        "question_text": "What type of attack exploits the trust a website has in a user's browser by tricking the browser into sending unauthorized commands using the user's cookies?",
        "topic": "OWASP Top 10",
        "difficulty": "medium",
        "point_value": 10.0,
        "explanation": "Cross-Site Request Forgery (CSRF) tricks a victim's authenticated browser into executing unwanted actions on an application where they currently hold a session.",
        "options": [
            {"label": "A", "text": "Cross-Site Scripting (XSS)", "correct": False},
            {"label": "B", "text": "Cross-Site Request Forgery (CSRF)", "correct": True},
            {"label": "C", "text": "Clickjacking", "correct": False},
            {"label": "D", "text": "Command Injection", "correct": False},
        ],
    },
    {
        "question_text": "What defense mechanism adds random padding and memory address randomization to make buffer overflow exploitation substantially harder?",
        "topic": "Binary Exploitation & Memory Safety",
        "difficulty": "hard",
        "point_value": 10.0,
        "explanation": "Address Space Layout Randomization (ASLR) randomizes the memory locations of program components (stack, heap, libraries) to prevent reliable jump-to-shellcode attacks.",
        "options": [
            {"label": "A", "text": "ASLR (Address Space Layout Randomization)", "correct": True},
            {"label": "B", "text": "DHCP Snooping", "correct": False},
            {"label": "C", "text": "BGP Anycast", "correct": False},
            {"label": "D", "text": "CORS Preflight", "correct": False},
        ],
    },
    {
        "question_text": "Which of the following ports is standard for SSH (Secure Shell) remote management?",
        "topic": "Network Ports",
        "difficulty": "easy",
        "point_value": 10.0,
        "explanation": "Port 22 is the registered default TCP port for Secure Shell (SSH).",
        "options": [
            {"label": "A", "text": "Port 21", "correct": False},
            {"label": "B", "text": "Port 22", "correct": True},
            {"label": "C", "text": "Port 23", "correct": False},
            {"label": "D", "text": "Port 25", "correct": False},
        ],
    },
]

ROUND_3_QUESTIONS: List[Dict[str, Any]] = [
    {
        "question_text": "In Ethereum smart contract development, what infamous vulnerability allowed the attacker to recursively withdraw ether before the contract could update the sender's balance in the 2016 DAO incident?",
        "topic": "Smart Contract & Blockchain Security",
        "difficulty": "hard",
        "point_value": 20.0,
        "code_snippet": "(bool success, ) = msg.sender.call{value: amount}(\"\");\nrequire(success);\nbalances[msg.sender] -= amount; // state updated after external call!",
        "explanation": "Reentrancy vulnerability occurs when an external call is made before internal state changes are recorded, allowing the receiving contract's fallback to call back into the withdraw function.",
        "options": [
            {"label": "A", "text": "Integer Underflow", "correct": False},
            {"label": "B", "text": "Reentrancy Vulnerability", "correct": True},
            {"label": "C", "text": "Front-Running / MEV", "correct": False},
            {"label": "D", "text": "Selfdestruct Gas Siphoning", "correct": False},
        ],
    },
    {
        "question_text": "An incident responder discovers an APT group utilizing 'Living off the Land' (LotL) binaries. What does this evasion strategy specifically entail?",
        "topic": "Threat Hunting & Incident Response",
        "difficulty": "hard",
        "point_value": 20.0,
        "explanation": "Living off the Land (LotL / LOLBins) utilizes legitimate, pre-installed administrative operating system binaries (e.g. certutil, powershell, wmic, rundll32) to evade antivirus signatures.",
        "options": [
            {"label": "A", "text": "Physically burying wireless repeaters in outdoor terrain", "correct": False},
            {"label": "B", "text": "Using native, legitimate OS utilities and scripts (LOLBins) already present on the victim system instead of dropping custom malware files", "correct": True},
            {"label": "C", "text": "Deploying zero-day kernel rootkits that survive hard disk drive wiping", "correct": False},
            {"label": "D", "text": "Rewriting legacy C tools into Rust to bypass memory safety checks", "correct": False},
        ],
    },
    {
        "question_text": "What core paradigm underlies the Zero Trust Architecture (ZTA) as formalized in NIST SP 800-207?",
        "topic": "Zero Trust Security",
        "difficulty": "hard",
        "point_value": 20.0,
        "explanation": "Zero Trust eliminates implicit trust based on network location: 'Never Trust, Always Verify' every user, asset, and data transaction.",
        "options": [
            {"label": "A", "text": "Trust all internal corporate LAN devices once authenticated behind the main edge firewall", "correct": False},
            {"label": "B", "text": "'Never Trust, Always Verify' — continuously evaluate context, identity, device posture, and least privilege for every transaction", "correct": True},
            {"label": "C", "text": "Prohibit all employees from utilizing mobile phones or laptops outside headquarters", "correct": False},
            {"label": "D", "text": "Replace all passwords with biometric retina scanners on all office doors", "correct": False},
        ],
    },
    {
        "question_text": "In the MITRE ATT&CK framework, which tactical category covers actions taken by adversaries to preserve access across restarts, changed credentials, and interruptions?",
        "topic": "Threat Frameworks (MITRE ATT&CK)",
        "difficulty": "hard",
        "point_value": 20.0,
        "explanation": "Persistence consists of techniques adversaries use to keep access across system restarts, scheduled tasks, registry modifications, or service installations.",
        "options": [
            {"label": "A", "text": "Reconnaissance", "correct": False},
            {"label": "B", "text": "Initial Access", "correct": False},
            {"label": "C", "text": "Persistence", "correct": True},
            {"label": "D", "text": "Defense Evasion", "correct": False},
        ],
    },
    {
        "question_text": "What cryptographic vulnerability allows an adversary who discovers that two different input messages produce the exact same SHA-1 hash to forge digital certificates?",
        "topic": "Applied Cryptography",
        "difficulty": "hard",
        "point_value": 20.0,
        "explanation": "A Hash Collision occurs when two different inputs yield the identical output hash. SHAttered (2017) demonstrated practical collisions in SHA-1, forcing deprecation.",
        "options": [
            {"label": "A", "text": "Pre-image Resistance", "correct": False},
            {"label": "B", "text": "Hash Collision", "correct": True},
            {"label": "C", "text": "Padding Oracle Attack", "correct": False},
            {"label": "D", "text": "Side-Channel Timing Leak", "correct": False},
        ],
    },
    {
        "question_text": "During digital forensic triage of a compromised Windows host, where are execution artifacts detailing process path, run count, and last execution timestamp recorded?",
        "topic": "Digital Forensics",
        "difficulty": "hard",
        "point_value": 20.0,
        "code_snippet": "C:\\Windows\\Prefetch\\*.pf\nC:\\Windows\\System32\\winevt\\Logs\\Security.evtx",
        "explanation": "Windows Prefetch files (.pf) are maintained by the memory manager to optimize boot and application startup, recording program name, run count, and timestamps.",
        "options": [
            {"label": "A", "text": "Windows Prefetch directory and Shimcache / Amcache", "correct": True},
            {"label": "B", "text": "C:\\Program Files\\Common Files\\DirectX\\", "correct": False},
            {"label": "C", "text": "BIOS Flash EEPROM registers", "correct": False},
            {"label": "D", "text": "Recycle Bin INFO2 files only", "correct": False},
        ],
    },
    {
        "question_text": "What type of cryptographic attack exploits subtle variations in execution duration or CPU power consumption to extract private keys without breaking mathematical algorithms?",
        "topic": "Hardware & Cryptographic Attacks",
        "difficulty": "hard",
        "point_value": 20.0,
        "explanation": "Side-Channel Attacks exploit physical implementation leakages such as execution time, power consumption (DPA), electromagnetic radiation, or acoustic emanations.",
        "options": [
            {"label": "A", "text": "Brute Force Attack", "correct": False},
            {"label": "B", "text": "Side-Channel Attack", "correct": True},
            {"label": "C", "text": "Rainbow Table Lookup", "correct": False},
            {"label": "D", "text": "Dictionary Attack", "correct": False},
        ],
    },
    {
        "question_text": "In a 51% attack against a Proof-of-Work blockchain network, what malicious capability does the majority mining hashpower grant to the attacker?",
        "topic": "Blockchain Security",
        "difficulty": "hard",
        "point_value": 20.0,
        "explanation": "An attacker with >50% hashrate can re-organize the blockchain by creating a secret longer chain, enabling double-spending of their own coins and censoring transactions.",
        "options": [
            {"label": "A", "text": "Stealing private keys directly from offline paper cold wallets", "correct": False},
            {"label": "B", "text": "Double-spending their own transactions and reversing recent payment confirmations", "correct": True},
            {"label": "C", "text": "Instantly minting arbitrary quantities of coins violating the fixed supply cap", "correct": False},
            {"label": "D", "text": "Changing other users' wallet passwords remotely", "correct": False},
        ],
    },
    {
        "question_text": "What is the primary objective of 'Pass-the-Hash' (PtH) lateral movement in an Active Directory environment?",
        "topic": "Active Directory & Lateral Movement",
        "difficulty": "hard",
        "point_value": 20.0,
        "explanation": "Pass-the-Hash allows an attacker to authenticate to remote servers or services using the NTLM hash of an account's password without needing to crack the plaintext.",
        "options": [
            {"label": "A", "text": "Cracking plaintext passwords on cloud GPU clusters", "correct": False},
            {"label": "B", "text": "Authenticating to remote services using harvested NTLM hashes directly, without cracking them to plaintext", "correct": True},
            {"label": "C", "text": "Flooding domain controllers with bogus Kerberos TGT requests to crash LSASS", "correct": False},
            {"label": "D", "text": "Injecting DLLs into edge VPN routers", "correct": False},
        ],
    },
    {
        "question_text": "What security mechanism in web development prevents an attacker from framing a target application in a hidden <iframe> to trick users into clicking buttons (Clickjacking)?",
        "topic": "Web Application Security",
        "difficulty": "hard",
        "point_value": 20.0,
        "code_snippet": "Content-Security-Policy: frame-ancestors 'none';\nX-Frame-Options: DENY",
        "explanation": "The X-Frame-Options: DENY / SAMEORIGIN header or CSP frame-ancestors 'none' / 'self' prevents the browser from rendering the page inside any <iframe>.",
        "options": [
            {"label": "A", "text": "X-Frame-Options: DENY and CSP frame-ancestors directive", "correct": True},
            {"label": "B", "text": "Access-Control-Allow-Methods: GET, POST", "correct": False},
            {"label": "C", "text": "Cache-Control: no-cache, no-store", "correct": False},
            {"label": "D", "text": "Strict-Dynamic in script-src", "correct": False},
        ],
    },
]


async def seed_questions(db: AsyncSession):
    """Seed 50 authentic cybersecurity questions across the 3 rounds."""
    rounds_res = await db.execute(select(Round).order_by(Round.round_number))
    rounds = rounds_res.scalars().all()
    if not rounds or len(rounds) < 3:
        return

    r1, r2, r3 = rounds[0], rounds[1], rounds[2]

    # Check if already seeded
    q_check = await db.execute(select(Question).where(Question.round_id == r1.id))
    if q_check.scalars().first():
        return

    # Seed Round 1
    for item in ROUND_1_QUESTIONS:
        q = Question(
            round_id=r1.id,
            question_text=item["question_text"],
            topic=item.get("topic"),
            difficulty=item.get("difficulty", "medium"),
            point_value=item["point_value"],
            explanation=item.get("explanation"),
            code_snippet=item.get("code_snippet"),
            is_active=True,
        )
        db.add(q)
        await db.flush()
        for idx, opt in enumerate(item["options"]):
            db.add(AnswerOption(
                question_id=q.id,
                option_label=opt["label"],
                option_text=opt["text"],
                is_correct=opt["correct"],
                display_order=idx,
            ))

    # Seed Round 2
    for item in ROUND_2_QUESTIONS:
        q = Question(
            round_id=r2.id,
            question_text=item["question_text"],
            topic=item.get("topic"),
            difficulty=item.get("difficulty", "medium"),
            point_value=item["point_value"],
            explanation=item.get("explanation"),
            code_snippet=item.get("code_snippet"),
            is_active=True,
        )
        db.add(q)
        await db.flush()
        for idx, opt in enumerate(item["options"]):
            db.add(AnswerOption(
                question_id=q.id,
                option_label=opt["label"],
                option_text=opt["text"],
                is_correct=opt["correct"],
                display_order=idx,
            ))

    # Seed Round 3
    for item in ROUND_3_QUESTIONS:
        q = Question(
            round_id=r3.id,
            question_text=item["question_text"],
            topic=item.get("topic"),
            difficulty=item.get("difficulty", "hard"),
            point_value=item["point_value"],
            explanation=item.get("explanation"),
            code_snippet=item.get("code_snippet"),
            is_active=True,
        )
        db.add(q)
        await db.flush()
        for idx, opt in enumerate(item["options"]):
            db.add(AnswerOption(
                question_id=q.id,
                option_label=opt["label"],
                option_text=opt["text"],
                is_correct=opt["correct"],
                display_order=idx,
            ))

    # Also open Round 1 so participants can enter and practice immediately
    r1.status = "open"
    await db.commit()
