import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search } from 'lucide-react';

export default function StudentList() {
    const { branch, route } = useParams();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                let url = '/api/students';
                const params = new URLSearchParams();
                if (branch) params.append('branch', branch);
                if (route) params.append('route', route);
                if (params.toString()) url += `?${params.toString()}`;
                
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setStudents(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [branch, route]);

    const filtered = students.filter(s => 
        (s.name?.toLowerCase() || '').includes(search.toLowerCase()) || 
        (s.stop_name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xl font-bold">Students {branch ? `- ${branch}` : ''} {route ? `/ ${route}` : ''}</CardTitle>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search students..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        className="pl-8"
                    />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? <div className="p-8 text-center text-muted-foreground">Loading students...</div> : (
                    <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Route</TableHead>
                                <TableHead>Stop</TableHead>
                                <TableHead className="text-right">Location</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No students found.</TableCell>
                                </TableRow>
                            ) : filtered.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>{student.branch}</TableCell>
                                    <TableCell>{student.route}</TableCell>
                                    <TableCell>{student.stop_name || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild size="sm" variant={student.latitude ? "secondary" : "destructive"}>
                                            <Link to={`/map/${student.id}`}>
                                                <MapPin className="mr-2 h-4 w-4" />
                                                {student.latitude ? 'View Stop' : 'Set Stop'}
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
